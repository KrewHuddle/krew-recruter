/**
 * Platform Settings Encryption Key Rotation
 *
 * Re-encrypts every row in the `platform_settings` table whose key is in
 * SENSITIVE_KEYS using a new encryption key. Use this when rotating
 * PLATFORM_SETTINGS_ENCRYPTION_KEY — for example, because the existing
 * value is the placeholder shipped in `.env`, or because the old key was
 * exposed in a backup, log, or repo commit.
 *
 * ───────────────────────────────────────────────────────────────────
 * USAGE
 * ───────────────────────────────────────────────────────────────────
 *
 *   1. Generate a fresh key (do this on a trusted machine):
 *
 *        openssl rand -base64 48
 *
 *   2. DRY RUN — verifies the old key can decrypt every sensitive row,
 *      writes a backup file, and reports what would change. No DB writes.
 *
 *        OLD_PLATFORM_SETTINGS_ENCRYPTION_KEY='<current value from .env>' \
 *        NEW_PLATFORM_SETTINGS_ENCRYPTION_KEY='<the value from step 1>' \
 *        tsx server/scripts/rotatePlatformSettingsKey.ts
 *
 *   3. APPLY — actually re-encrypts and writes. Backup is still made first.
 *
 *        OLD_PLATFORM_SETTINGS_ENCRYPTION_KEY='<current value>' \
 *        NEW_PLATFORM_SETTINGS_ENCRYPTION_KEY='<new value>' \
 *        tsx server/scripts/rotatePlatformSettingsKey.ts --apply
 *
 *   4. Update PLATFORM_SETTINGS_ENCRYPTION_KEY in every environment (local
 *      .env, prod, staging, CI secrets) to the NEW value, then restart the
 *      app so the new key is loaded.
 *
 *   5. CRITICAL: rotate the underlying secrets too. The old encryption key
 *      is assumed compromised, which means anyone who had it could have
 *      already decrypted the previous values. Generate a new Meta system
 *      user access token in Meta Business Manager, save it via the admin
 *      UI (which encrypts with the new key), then revoke the old token.
 *
 *   6. Verify Meta ads still work end-to-end, then securely delete the
 *      backup JSON file written by this script.
 *
 * ───────────────────────────────────────────────────────────────────
 * SAFETY MODEL
 * ───────────────────────────────────────────────────────────────────
 *
 *  - The script ALWAYS writes a timestamped backup of the current
 *    encrypted values to ./platform-settings-backup-<timestamp>.json
 *    before doing anything else. The backup contains the rows in their
 *    *currently encrypted* form, which is safe to write to disk because
 *    the values are useless without the old key.
 *
 *  - It NEVER writes back to the database in dry-run mode (the default).
 *
 *  - In apply mode, it runs in two phases: first it decrypts every row
 *    with the old key in memory; if any single row fails to decrypt
 *    (auth tag mismatch, malformed format, etc.), the entire rotation
 *    aborts and zero rows are modified. Only after every row decrypts
 *    cleanly does the second phase begin re-encrypting and writing.
 *
 *  - Unlike server/services/platformSettings.ts which silently returns
 *    the input when decryption fails, this script's `decryptStrict`
 *    throws on any failure. This is intentional — silent fallback in a
 *    rotation script would corrupt data by re-encrypting garbage.
 */

import "dotenv/config";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { writeFileSync } from "fs";
import { db } from "../db";
import { platformSettings } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

// These must match the constants in server/services/platformSettings.ts.
// If you change them there, change them here too — we duplicate rather
// than import because platformSettings.ts doesn't export them and a
// security-critical file shouldn't grow new exports for a script's sake.
const ALGORITHM = "aes-256-gcm";
const SCRYPT_SALT = "krew-platform-salt";
const SENSITIVE_KEYS = ["meta_app_secret", "meta_access_token"];

function deriveKey(rawPassphrase: string): Buffer {
  return scryptSync(rawPassphrase, SCRYPT_SALT, 32);
}

function decryptStrict(encryptedValue: string, key: Buffer): string {
  const parts = encryptedValue.split(":");
  if (parts.length !== 3) {
    throw new Error(
      "value is not in iv:authTag:ciphertext format — was this row stored as plaintext?"
    );
  }
  const [ivHex, authTagHex, ciphertext] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  // .final() throws if the GCM auth tag doesn't match — exactly what we
  // want here. Do NOT wrap in try/catch; the caller relies on this
  // throwing to know the old key is wrong.
  decrypted += decipher.final("utf8");
  return decrypted;
}

function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const oldRaw = process.env.OLD_PLATFORM_SETTINGS_ENCRYPTION_KEY;
  const newRaw = process.env.NEW_PLATFORM_SETTINGS_ENCRYPTION_KEY;

  if (!oldRaw || !newRaw) {
    console.error("ERROR: both OLD_PLATFORM_SETTINGS_ENCRYPTION_KEY and");
    console.error("       NEW_PLATFORM_SETTINGS_ENCRYPTION_KEY must be set.");
    console.error("");
    console.error("Generate a new key with:");
    console.error("  openssl rand -base64 48");
    console.error("");
    console.error("Then run:");
    console.error("  OLD_PLATFORM_SETTINGS_ENCRYPTION_KEY='...' \\");
    console.error("  NEW_PLATFORM_SETTINGS_ENCRYPTION_KEY='...' \\");
    console.error("  tsx server/scripts/rotatePlatformSettingsKey.ts");
    process.exit(1);
  }

  if (oldRaw === newRaw) {
    console.error("ERROR: old and new keys are identical — nothing to rotate.");
    process.exit(1);
  }

  if (newRaw.length < 16) {
    console.error("ERROR: new key is suspiciously short (<16 chars).");
    console.error("       Generate one with: openssl rand -base64 48");
    process.exit(1);
  }

  console.log("");
  console.log("=========================================");
  console.log("  Platform Settings Key Rotation");
  console.log("=========================================");
  console.log(`Mode: ${apply ? "APPLY (writes will happen)" : "DRY RUN (no writes)"}`);
  console.log("");

  const oldKey = deriveKey(oldRaw);
  const newKey = deriveKey(newRaw);

  // ── Fetch sensitive rows ─────────────────────────────────────────
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, SENSITIVE_KEYS));

  console.log(`Found ${rows.length} sensitive row(s) in platform_settings.`);

  if (rows.length === 0) {
    console.log("Nothing to rotate. Done.");
    return;
  }

  // ── Always back up first ─────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `./platform-settings-backup-${timestamp}.json`;
  writeFileSync(
    backupPath,
    JSON.stringify(
      rows.map((r) => ({
        id: r.id,
        key: r.key,
        encryptedValue: r.value, // still encrypted — safe to write to disk
        description: r.description,
        updatedAt: r.updatedAt,
      })),
      null,
      2
    )
  );
  console.log(`Backup written: ${backupPath}`);
  console.log("");

  // ── Phase 1: decrypt every row with the old key, in memory only ──
  // If any single row fails, abort. We never start writing until we
  // have proven we can round-trip every row.
  console.log("Phase 1 — decrypting all rows with old key:");
  const decryptedRows: Array<{ id: number; key: string; plaintext: string }> = [];

  for (const row of rows) {
    try {
      const plaintext = decryptStrict(row.value, oldKey);
      decryptedRows.push({ id: row.id, key: row.key, plaintext });
      console.log(`  ✓ ${row.key.padEnd(24)} decrypted (${plaintext.length} chars)`);
    } catch (err: any) {
      console.error("");
      console.error(`  ✗ ${row.key}: FAILED to decrypt with old key.`);
      console.error(`     Reason: ${err.message}`);
      console.error("");
      console.error("ABORTING — the old key may be wrong, or this row");
      console.error("was never encrypted in the first place. No rows have");
      console.error("been modified. Backup is at:");
      console.error(`  ${backupPath}`);
      process.exit(2);
    }
  }

  console.log("");
  console.log("All rows decrypted successfully with the old key.");

  if (!apply) {
    console.log("");
    console.log("DRY RUN COMPLETE — no rows were modified.");
    console.log("Re-run with --apply to actually rotate.");
    console.log("");
    return;
  }

  // ── Phase 2: re-encrypt with new key and write back ──────────────
  console.log("");
  console.log("Phase 2 — re-encrypting with new key and writing:");
  for (const row of decryptedRows) {
    const newCiphertext = encryptWithKey(row.plaintext, newKey);
    await db
      .update(platformSettings)
      .set({ value: newCiphertext, updatedAt: new Date() })
      .where(eq(platformSettings.id, row.id));
    console.log(`  ✓ ${row.key.padEnd(24)} re-encrypted and written`);
  }

  console.log("");
  console.log("=========================================");
  console.log("  Rotation complete.");
  console.log("=========================================");
  console.log("");
  console.log("NEXT STEPS:");
  console.log("");
  console.log("  1. Update PLATFORM_SETTINGS_ENCRYPTION_KEY everywhere:");
  console.log("       - local .env");
  console.log("       - production environment");
  console.log("       - staging / preview environments");
  console.log("       - CI secrets if they exist");
  console.log("");
  console.log("  2. Restart the app so the new key is loaded.");
  console.log("");
  console.log("  3. Verify Meta ads still work end-to-end:");
  console.log("       - Open the admin UI, confirm Meta credentials still appear masked");
  console.log("       - Try fetching campaign stats from a job with an active ad");
  console.log("");
  console.log("  4. ROTATE THE UNDERLYING SECRETS in Meta Business Manager.");
  console.log("     The old encryption key is assumed compromised, so the values");
  console.log("     it protected must be considered exposed too:");
  console.log("       - Generate a new Meta system user access token");
  console.log("       - Save it via the admin UI (encrypts with the new key)");
  console.log("       - Revoke the old token in Meta Business Manager");
  console.log("");
  console.log("  5. Once everything is verified, securely delete the backup:");
  console.log(`       shred -u ${backupPath}    # or rm if shred isn't available`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
