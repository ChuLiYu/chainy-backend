import { createHash } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({});

function getEventsBucketName(): string {
  const bucket = process.env.CHAINY_EVENTS_BUCKET_NAME;

  if (!bucket) {
    throw new Error("Missing CHAINY_EVENTS_BUCKET_NAME environment variable");
  }

  return bucket;
}

export interface PutEventParams {
  eventType: string;
  code: string;
  detail: Record<string, unknown>;
}

export function buildObjectKey(eventType: string, code: string, timestamp: Date): string {
  const iso = timestamp.toISOString();
  const [datePart, timePart] = iso.split("T");
  const hour = timePart.slice(0, 2);

  return `${eventType}/dt=${datePart}/hour=${hour}/${code}-${timestamp.getTime()}.jsonl`;
}

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function maskWalletAddress(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length <= 4) {
    return "****";
  }

  const head = trimmed.slice(0, 4);
  const tail = trimmed.slice(-4);
  return `${head}***${tail}`;
}

function stripUrlNoise(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value;
  }
}

function sanitizeDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...detail };
  let redacted = false;

  if (typeof detail.owner === "string" && detail.owner.trim().length > 0) {
    sanitized.owner_hash = hashString(detail.owner.trim());
    delete sanitized.owner;
    redacted = true;
  }

  if (typeof detail.wallet_address === "string" && detail.wallet_address.trim().length > 0) {
    sanitized.wallet_address_masked = maskWalletAddress(detail.wallet_address);
    delete sanitized.wallet_address;
    redacted = true;
  }

  if (typeof detail.user_agent === "string" && detail.user_agent.trim().length > 0) {
    sanitized.user_agent_hash = hashString(detail.user_agent.trim());
    delete sanitized.user_agent;
    redacted = true;
  }

  if (typeof detail.referer === "string" && detail.referer.trim().length > 0) {
    sanitized.referer_origin = stripUrlNoise(detail.referer);
    delete sanitized.referer;
    redacted = true;
  }

  if (typeof detail.target === "string" && detail.target.trim().length > 0) {
    sanitized.target = stripUrlNoise(detail.target);
  }

  if (redacted) {
    sanitized.sensitive_redacted = true;
  }

  return sanitized;
}

export async function putDomainEvent(
  { eventType, code, detail }: PutEventParams,
  client: Pick<S3Client, "send"> = s3Client,
): Promise<void> {
  const bucket = getEventsBucketName();
  const environment = process.env.CHAINY_ENVIRONMENT ?? "unknown";
  const timestamp = new Date();
  const key = buildObjectKey(eventType, code, timestamp);
  const sanitizedDetail = sanitizeDetail(detail);

  const payload = {
    event_type: eventType,
    code,
    environment,
    emitted_at: timestamp.toISOString(),
    ...sanitizedDetail,
  };

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: `${JSON.stringify(payload)}\n`,
      ContentType: "application/json",
    }),
  );
}
