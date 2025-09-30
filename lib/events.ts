import { createHash } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({});

// Resolve events bucket injected through Lambda environment variables.
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

// Partition events by type/date/hour for downstream analytics queries.
export function buildObjectKey(eventType: string, code: string, timestamp: Date): string {
  const iso = timestamp.toISOString();
  const [datePart, timePart] = iso.split("T");
  const hour = timePart.slice(0, 2);

  return `${eventType}/dt=${datePart}/hour=${hour}/${code}-${timestamp.getTime()}.jsonl`;
}

function sha256(value: string, salt?: string): string {
  return createHash("sha256").update(`${salt ?? ""}${value}`).digest("hex");
}

function maskWalletAddress(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length <= 8) {
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

function inferDeviceInfo(userAgent: string | undefined) {
  if (!userAgent) {
    return {};
  }

  const ua = userAgent.toLowerCase();
  let deviceType = "desktop";
  if (ua.includes("mobile")) {
    deviceType = "mobile";
  } else if (ua.includes("tablet")) {
    deviceType = "tablet";
  }

  let osFamily = "unknown";
  if (ua.includes("windows")) osFamily = "windows";
  else if (ua.includes("mac os x")) osFamily = "macos";
  else if (ua.includes("android")) osFamily = "android";
  else if (ua.includes("iphone") || ua.includes("ipad")) osFamily = "ios";
  else if (ua.includes("linux")) osFamily = "linux";

  let browserFamily = "unknown";
  if (ua.includes("chrome")) browserFamily = "chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) browserFamily = "safari";
  if (ua.includes("firefox")) browserFamily = "firefox";
  if (ua.includes("edg")) browserFamily = "edge";

  return {
    device_type: deviceType,
    os_family: osFamily,
    browser_family: browserFamily,
  };
}

function pickPrimaryLanguage(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const lang = header.split(",")[0]?.trim();
  return lang && lang.length > 0 ? lang : undefined;
}

// Remove or coarsen sensitive values before persisting the event record.
function sanitizeDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...detail };
  let redacted = false;
  const salt = process.env.CHAINY_IP_HASH_SALT ?? process.env.CHAINY_HASH_SALT;

  if (typeof detail.owner === "string" && detail.owner.trim().length > 0) {
    sanitized.owner_hash = sha256(detail.owner.trim(), salt);
    delete sanitized.owner;
    redacted = true;
  }

  if (typeof detail.wallet_address === "string" && detail.wallet_address.trim().length > 0) {
    sanitized.wallet_address_masked = maskWalletAddress(detail.wallet_address);
    delete sanitized.wallet_address;
    redacted = true;
  }

  if (typeof detail.user_agent === "string" && detail.user_agent.trim().length > 0) {
    sanitized.user_agent_hash = sha256(detail.user_agent.trim(), salt);
    Object.assign(sanitized, inferDeviceInfo(detail.user_agent));
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

  if (typeof detail.ip_address === "string" && detail.ip_address.trim().length > 0) {
    sanitized.ip_hash = sha256(detail.ip_address.trim(), salt);
    delete sanitized.ip_address;
    redacted = true;
  }

  if (typeof detail.accept_language === "string") {
    const language = pickPrimaryLanguage(detail.accept_language);
    if (language) {
      sanitized.user_language = language;
    }
    delete sanitized.accept_language;
  }

  if (typeof detail.geo_country === "string" && detail.geo_country.trim().length > 0) {
    sanitized.geo_country = detail.geo_country.trim().toUpperCase();
  }

  if (typeof detail.geo_region === "string" && detail.geo_region.trim().length > 0) {
    sanitized.geo_region = detail.geo_region.trim();
  }

  if (typeof detail.geo_city === "string" && detail.geo_city.trim().length > 0) {
    sanitized.geo_city = detail.geo_city.trim();
  }

  if (typeof detail.ip_asn === "string" && detail.ip_asn.trim().length > 0) {
    sanitized.ip_asn = detail.ip_asn.trim();
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
