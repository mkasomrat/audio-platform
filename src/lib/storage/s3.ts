import "server-only";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Works with any S3-compatible service (Supabase Storage S3 endpoint, Cloudflare R2). Env names keep the R2_ prefix.
function env() {
  const endpoint = process.env.R2_ENDPOINT, accessKey = process.env.R2_ACCESS_KEY_ID, secret = process.env.R2_SECRET_ACCESS_KEY, bucket = process.env.R2_BUCKET_NAME;
  if (!endpoint || !accessKey || !secret || !bucket) return null;
  return { endpoint, accessKey, secret, bucket, region: process.env.STORAGE_REGION || "auto" };
}
export const storageConfigured = () => env() !== null;

export function storageEgressConfig() {
  const e = env();
  return e ? { access_key: e.accessKey, secret: e.secret, region: e.region, endpoint: e.endpoint, bucket: e.bucket, force_path_style: true } : null;
}
function client() {
  const e = env();
  if (!e) throw new Error("Storage is not configured");
  return { e, s3: new S3Client({ region: e.region, endpoint: e.endpoint, forcePathStyle: true, credentials: { accessKeyId: e.accessKey, secretAccessKey: e.secret } }) };
}

export async function presignDownload(key: string, filename: string) {
  const { e, s3 } = client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: e.bucket, Key: key, ResponseContentDisposition: `attachment; filename="${filename.replace(/[^\w.\-]/g, "_")}"` }), { expiresIn: 900 });
}

// Reads only the first bytes of the stored file to check the REAL container/codec (OGG + Opus), not the file extension.
export async function inspectOgg(key: string) {
  const { e, s3 } = client();
  const out = await s3.send(new GetObjectCommand({ Bucket: e.bucket, Key: key, Range: "bytes=0-2047" }));
  const buf = Buffer.from(await out.Body!.transformToByteArray());
  const isOgg = buf.subarray(0, 4).toString("latin1") === "OggS";
  const idx = buf.indexOf("OpusHead", 0, "latin1");
  return { isOgg, isOpus: isOgg && idx >= 0, channels: idx >= 0 ? buf[idx + 9] : null };
}

export async function deleteObject(key: string) {
  const { e, s3 } = client();
  await s3.send(new DeleteObjectCommand({ Bucket: e.bucket, Key: key }));
}
export async function pingStorage() {
  const { e, s3 } = client();
  await s3.send(new ListObjectsV2Command({ Bucket: e.bucket, MaxKeys: 1 }));
}
