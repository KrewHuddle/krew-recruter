import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { db } from "../db";
import { platformSettings } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const raw = process.env.PLATFORM_SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("PLATFORM_SETTINGS_ENCRYPTION_KEY not set");
  }
  // Derive a 32-byte key from whatever string the admin provides
  return scryptSync(raw, "krew-platform-salt", 32);
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedValue: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertext] = encryptedValue.split(":");
  if (!ivHex || !authTagHex || !ciphertext) {
    // Not encrypted — return as-is (for backward compat / non-sensitive values)
    return encryptedValue;
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails, return raw value (may be unencrypted plain text)
    return encryptedValue;
  }
}

// Keys that contain secrets and must be encrypted at rest
const SENSITIVE_KEYS = new Set([
  "meta_app_secret",
  "meta_access_token",
]);

export async function getPlatformSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key));
  if (!row) return null;
  return SENSITIVE_KEYS.has(key) ? decrypt(row.value) : row.value;
}

export async function setPlatformSetting(
  key: string,
  value: string,
  updatedBy?: string,
  description?: string
): Promise<void> {
  const storedValue = SENSITIVE_KEYS.has(key) ? encrypt(value) : value;

  // Upsert
  const [existing] = await db
    .select({ id: platformSettings.id })
    .from(platformSettings)
    .where(eq(platformSettings.key, key));

  if (existing) {
    await db
      .update(platformSettings)
      .set({
        value: storedValue,
        updatedAt: new Date(),
        ...(updatedBy ? { updatedBy } : {}),
        ...(description ? { description } : {}),
      })
      .where(eq(platformSettings.key, key));
  } else {
    await db.insert(platformSettings).values({
      key,
      value: storedValue,
      updatedBy: updatedBy || null,
      description: description || null,
    });
  }
}

export async function getAllPlatformSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(platformSettings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = SENSITIVE_KEYS.has(row.key) ? decrypt(row.value) : row.value;
  }
  return result;
}

/**
 * Returns masked settings for display in admin UI.
 * Sensitive values show last 4 chars only.
 */
export async function getMaskedPlatformSettings(): Promise<
  Array<{ key: string; value: string; description: string | null; updatedAt: Date | null }>
> {
  const rows = await db.select().from(platformSettings);
  return rows.map((row) => ({
    key: row.key,
    value: SENSITIVE_KEYS.has(row.key)
      ? maskValue(decrypt(row.value))
      : row.value,
    description: row.description,
    updatedAt: row.updatedAt,
  }));
}

function maskValue(val: string): string {
  if (val.length <= 4) return "••••";
  return "••••••••" + val.slice(-4);
}

export interface MetaCredentials {
  accessToken: string;
  adAccountId: string;
  pageId: string;
  appId: string;
  appSecret: string;
  markupPercent: number;
  defaultDailyBudgetCents: number;
  maxDailyBudgetCents: number;
}

/**
 * Reads Meta credentials from platformSettings table.
 * Throws if required credentials are missing — caller should
 * show a user-friendly message, NOT expose the error.
 */
export async function getMetaCredentials(): Promise<MetaCredentials> {
  const keys = [
    "meta_access_token",
    "meta_ad_account_id",
    "meta_page_id",
    "meta_app_id",
    "meta_app_secret",
    "meta_platform_markup_percent",
    "meta_default_daily_budget_cents",
    "meta_max_daily_budget_cents",
  ];

  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, keys));

  const creds: Record<string, string> = {};
  for (const row of rows) {
    creds[row.key] = SENSITIVE_KEYS.has(row.key)
      ? decrypt(row.value)
      : row.value;
  }

  if (!creds.meta_access_token || !creds.meta_ad_account_id) {
    throw new Error("Meta ads not configured. Contact platform admin.");
  }

  return {
    accessToken: creds.meta_access_token,
    adAccountId: creds.meta_ad_account_id,
    pageId: creds.meta_page_id || "",
    appId: creds.meta_app_id || "",
    appSecret: creds.meta_app_secret || "",
    markupPercent: parseInt(creds.meta_platform_markup_percent || "20", 10),
    defaultDailyBudgetCents: parseInt(creds.meta_default_daily_budget_cents || "3200", 10),
    maxDailyBudgetCents: parseInt(creds.meta_max_daily_budget_cents || "10000", 10),
  };
}

/**
 * Check if Meta is configured (non-throwing).
 */
export async function isMetaConfiguredFromDB(): Promise<boolean> {
  try {
    await getMetaCredentials();
    return true;
  } catch {
    return false;
  }
}
