/**
 * DigitalOcean Spaces object storage client.
 *
 * Replaces the broken Replit-specific storage at
 * server/replit_integrations/object_storage/objectStorage.ts which
 * tried to fetch credentials from a sidecar at 127.0.0.1:1106 (a
 * Replit-only platform service that does not exist on DigitalOcean).
 *
 * DigitalOcean Spaces is S3-compatible, so we use the standard
 * @aws-sdk/client-s3 v3 client pointed at the Spaces regional endpoint.
 *
 * ─── Required environment variables ────────────────────────────────
 *
 *   DO_SPACES_KEY        Spaces access key ID
 *   DO_SPACES_SECRET     Spaces secret access key
 *   DO_SPACES_BUCKET     Bucket name (Space name)
 *   DO_SPACES_REGION     Region slug, e.g. "nyc3", "sfo3", "fra1",
 *                        "ams3", "sgp1", "syd1", "blr1"
 *
 * Optional:
 *
 *   DO_SPACES_CDN_ENDPOINT  Public CDN URL prefix for the bucket. If
 *                           set, public file URLs use this hostname
 *                           instead of the direct Spaces hostname.
 *                           Format: https://<cdn-id>.cdn.digitaloceanspaces.com
 *
 * ─── Provisioning checklist ────────────────────────────────────────
 *
 *   1. DigitalOcean dashboard → Spaces → Create a Space
 *      - Name: krew-recruiter-uploads (or similar)
 *      - Region: pick the same region as your app (e.g. nyc3)
 *      - Enable CDN: yes (for faster public file delivery)
 *      - File Listing: restricted (don't expose the bucket index)
 *
 *   2. DigitalOcean dashboard → API → Spaces Keys → Generate New Key
 *      - Name: krew-recruiter-server
 *      - Save the access key + secret immediately (secret is only
 *        shown once)
 *
 *   3. Set the env vars in DigitalOcean App Platform:
 *      Settings → Components → krew-recruter → Environment Variables
 *        DO_SPACES_KEY=<the key from step 2>
 *        DO_SPACES_SECRET=<the secret from step 2>     (mark as encrypted)
 *        DO_SPACES_BUCKET=<the Space name from step 1>
 *        DO_SPACES_REGION=<the region slug from step 1>
 *        DO_SPACES_CDN_ENDPOINT=<the CDN URL from the Space settings>
 *
 *   4. Bucket CORS (Spaces dashboard → Settings → CORS):
 *      Add an allowed origin matching your app domain
 *      (https://krewrecruiter.com), allowed methods GET PUT POST,
 *      allowed headers *, max age 3600. Required for direct
 *      browser uploads via presigned URLs.
 *
 *   5. Restart the app so it picks up the new env vars.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface SpacesConfig {
  client: S3Client;
  bucket: string;
  region: string;
  publicUrlPrefix: string;
}

let _config: SpacesConfig | null = null;

function getConfig(): SpacesConfig {
  if (_config) return _config;

  const key = process.env.DO_SPACES_KEY;
  const secret = process.env.DO_SPACES_SECRET;
  const bucket = process.env.DO_SPACES_BUCKET;
  const region = process.env.DO_SPACES_REGION;

  if (!key || !secret || !bucket || !region) {
    const missing = [
      !key && "DO_SPACES_KEY",
      !secret && "DO_SPACES_SECRET",
      !bucket && "DO_SPACES_BUCKET",
      !region && "DO_SPACES_REGION",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Object storage not configured: missing env vars ${missing}. ` +
      `See server/services/objectStorage.ts for the provisioning checklist.`
    );
  }

  // DigitalOcean Spaces endpoint format: https://<region>.digitaloceanspaces.com
  // The bucket is addressed via the path-style URL, NOT virtual-hosted, so the
  // S3 client must be configured with forcePathStyle: false (the default for
  // DO Spaces — they support virtual-hosted-style URLs at <bucket>.<region>.
  // digitaloceanspaces.com).
  const endpoint = `https://${region}.digitaloceanspaces.com`;

  const client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: key,
      secretAccessKey: secret,
    },
    // DO Spaces is S3-compatible and supports virtual-hosted-style URLs,
    // which is the default. Leaving forcePathStyle unset.
  });

  // Public URL prefix: prefer the CDN URL if configured, otherwise use the
  // direct Spaces virtual-hosted hostname. The CDN endpoint is faster for
  // public assets like ad image creatives served at scale.
  const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT;
  const publicUrlPrefix = cdnEndpoint
    ? cdnEndpoint.replace(/\/$/, "")
    : `https://${bucket}.${region}.digitaloceanspaces.com`;

  _config = { client, bucket, region, publicUrlPrefix };
  return _config;
}

/**
 * Returns true if DO Spaces credentials are configured. Used by route
 * handlers to short-circuit with a clear error before doing any work.
 */
export function isObjectStorageConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Uploads a file buffer to DO Spaces with public-read ACL and returns
 * the public URL.
 *
 * Used by the server-proxy upload pattern: client POSTs a small file
 * (logo, profile photo, etc.) to a multer endpoint, the server pushes
 * it to Spaces and returns the URL. Practical max ~10MB before the
 * proxy round-trip becomes slow — use getPresignedUploadUrl() for
 * larger files (videos).
 *
 * @param key       Object key, e.g. "org-logos/abc123-1234567890.png"
 * @param buffer    File contents as a Node Buffer
 * @param contentType  MIME type, e.g. "image/png"
 * @returns Public HTTPS URL where the file can be fetched
 */
export async function uploadPublicFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { client, bucket, publicUrlPrefix } = getConfig();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
      // CacheControl is set generously because uploaded user content
      // is content-addressed by timestamp in the key. If a user
      // re-uploads, the new file gets a new key, so the old URL can
      // be cached forever.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${publicUrlPrefix}/${key}`;
}

/**
 * Uploads a file buffer privately (no public-read ACL). Used for
 * sensitive content like interview videos that should only be
 * accessible via signed URLs to authorized viewers.
 */
export async function uploadPrivateFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { client, bucket } = getConfig();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "private",
    })
  );

  // Return the bare key — caller must use getSignedDownloadUrl(key)
  // to produce a time-limited viewable URL when needed.
  return key;
}

/**
 * Generates a presigned PUT URL for direct browser-to-Spaces upload.
 * The client uploads the file directly without going through our
 * server, which is essential for large files (interview videos)
 * because the server has request body size limits and the proxy
 * round-trip is slow.
 *
 * The URL is valid for `expiresInSeconds` (default 15 minutes).
 *
 * @param key             Where the file should land in the bucket
 * @param contentType     MIME type the client will upload with
 * @param expiresInSeconds  How long the URL is valid (default 900)
 * @param publicRead      Whether the uploaded file should be public-read
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900,
  publicRead = false
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const { client, bucket, publicUrlPrefix } = getConfig();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ACL: publicRead ? "public-read" : "private",
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    key,
    publicUrl: `${publicUrlPrefix}/${key}`,
  };
}

/**
 * Generates a presigned GET URL for downloading a private file.
 * Used by interview video playback in the recruiter dashboard.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { client, bucket } = getConfig();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes a file from Spaces. Used by GDPR data deletion flows
 * (replacing the deleteObject method on the broken Replit
 * ObjectStorageService class).
 *
 * Idempotent: silently succeeds if the file is already gone.
 */
export async function deleteFile(key: string): Promise<void> {
  const { client, bucket } = getConfig();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (err: any) {
    // S3 returns 204 even if the key didn't exist, so a thrown error
    // here usually means a real problem (auth, network, etc.). We
    // log but don't re-throw because GDPR delete flows want
    // best-effort cleanup, not hard failures.
    console.error(`[objectStorage] deleteFile failed for key=${key}:`, err.message);
  }
}

/**
 * Generates a unique storage key under the given prefix. Format:
 *   <prefix>/<scope-id>-<timestamp>-<random>.<ext>
 *
 * Examples:
 *   makeKey("org-logos", orgId, "png")  → "org-logos/abc123-1730000000000-x7k2.png"
 *   makeKey("worker-photos", userId, "jpg") → "worker-photos/usr_42-1730000000000-q9m4.jpg"
 *
 * The timestamp + random suffix prevents collisions when the same
 * scope ID uploads multiple files (e.g. an org changing logos several
 * times). The random suffix specifically defends against a race where
 * two requests with the same Date.now() value collide.
 */
export function makeKey(prefix: string, scopeId: string, ext: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  // Strip leading dot from extension if present, normalize to lowercase
  const normalizedExt = ext.replace(/^\./, "").toLowerCase();
  // Sanitize scopeId to avoid path traversal or weird characters in the key
  const safeScopeId = scopeId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${prefix}/${safeScopeId}-${timestamp}-${random}.${normalizedExt}`;
}
