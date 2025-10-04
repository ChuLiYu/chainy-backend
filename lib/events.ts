import { createHash } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const s3Client = new S3Client({});
const ssmClient = new SSMClient({});
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const MAX_TAGS = 10;

// Cache for SSM parameters to avoid repeated calls
// Implements secure caching with TTL to minimize AWS API calls and improve performance
const parameterCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Get parameter from SSM Parameter Store with caching
// Implements secure parameter retrieval with automatic decryption and error handling
async function getParameterFromSSM(parameterName: string): Promise<string> {
  // Check cache first
  const cached = parameterCache.get(parameterName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  try {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true, // For SecureString parameters
    });

    const response = await ssmClient.send(command);
    
    if (!response.Parameter?.Value) {
      throw new Error(`Parameter ${parameterName} not found or has no value`);
    }

    // Cache the result
    parameterCache.set(parameterName, {
      value: response.Parameter.Value,
      timestamp: Date.now(),
    });

    return response.Parameter.Value;
  } catch (error) {
    console.error(`Failed to get parameter ${parameterName}:`, error);
    throw new Error(`Failed to retrieve parameter ${parameterName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get hash salts from SSM Parameter Store with fallback
// Implements secure salt management with environment variable fallback for resilience
async function getHashSalts(): Promise<{ hashSalt: string; ipHashSalt: string }> {
  const hashSaltParam = process.env.CHAINY_HASH_SALT_PARAM;
  const ipHashSaltParam = process.env.CHAINY_IP_HASH_SALT_PARAM;

  if (!hashSaltParam || !ipHashSaltParam) {
    throw new Error(
      "Missing required environment variables: CHAINY_HASH_SALT_PARAM and CHAINY_IP_HASH_SALT_PARAM"
    );
  }

  try {
    const [hashSalt, ipHashSalt] = await Promise.all([
      getParameterFromSSM(hashSaltParam),
      getParameterFromSSM(ipHashSaltParam),
    ]);

    return { hashSalt, ipHashSalt };
  } catch (error) {
    console.error("Failed to get hash salts from SSM:", error);
    
    // Fallback to environment variables if SSM fails
    const fallbackHashSalt = process.env.CHAINY_HASH_SALT;
    const fallbackIpHashSalt = process.env.CHAINY_IP_HASH_SALT;
    
    if (fallbackHashSalt && fallbackIpHashSalt) {
      console.warn("Using fallback hash salts from environment variables");
      return {
        hashSalt: fallbackHashSalt,
        ipHashSalt: fallbackIpHashSalt,
      };
    }
    
    throw new Error(
      `Failed to get hash salts from SSM and no fallback environment variables available: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Resolve events bucket injected through Lambda environment variables.
// Provides centralized bucket name resolution for event storage
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
// Implements efficient partitioning strategy for Athena/Glue analytics processing
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

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
      .slice(0, MAX_TAGS);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, MAX_TAGS);
  }

  return undefined;
}

function toNumber(value: unknown, precision = 8): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const num = Number(value);
  if (Number.isNaN(num)) {
    return undefined;
  }

  return Number(num.toFixed(precision));
}

// Remove or coarsen sensitive values before persisting the event record.
// Implements privacy-preserving data sanitization with cryptographic hashing
function sanitizeDetail(
  detail: Record<string, unknown>,
  hashSalt: string,
  ipHashSalt: string,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...detail };
  let redacted = false;

  if (typeof detail.owner === "string" && detail.owner.trim().length > 0) {
    sanitized.owner_hash = sha256(detail.owner.trim(), hashSalt);
    delete sanitized.owner;
    redacted = true;
  }

  if (typeof detail.wallet_address === "string" && detail.wallet_address.trim().length > 0) {
    sanitized.wallet_address_masked = maskWalletAddress(detail.wallet_address);
    delete sanitized.wallet_address;
    redacted = true;
  }

  if (typeof detail.wallet_signature === "string" && detail.wallet_signature.trim().length > 0) {
    sanitized.wallet_signature_present = true;
    delete sanitized.wallet_signature;
    redacted = true;
  }

  if (typeof detail.wallet_provider === "string" && detail.wallet_provider.trim().length > 0) {
    sanitized.wallet_provider = detail.wallet_provider.trim().toLowerCase();
  }

  if (typeof detail.wallet_type === "string" && detail.wallet_type.trim().length > 0) {
    sanitized.wallet_type = detail.wallet_type.trim().toLowerCase();
  }

  if (typeof detail.dapp_id === "string" && detail.dapp_id.trim().length > 0) {
    sanitized.dapp_id = detail.dapp_id.trim();
  }

  if (typeof detail.integration_partner === "string" && detail.integration_partner.trim().length > 0) {
    sanitized.integration_partner = detail.integration_partner.trim();
  }

  if (typeof detail.client_version === "string" && detail.client_version.trim().length > 0) {
    sanitized.client_version = detail.client_version.trim();
  }

  if (typeof detail.project === "string" && detail.project.trim().length > 0) {
    sanitized.project = detail.project.trim();
  }

  if (typeof detail.developer_id === "string" && detail.developer_id.trim().length > 0) {
    sanitized.developer_id = detail.developer_id.trim();
  }

  if (typeof detail.chain_id === "string" && detail.chain_id.trim().length > 0) {
    sanitized.chain_id = detail.chain_id.trim();
  }

  if (typeof detail.token_symbol === "string" && detail.token_symbol.trim().length > 0) {
    sanitized.token_symbol = detail.token_symbol.trim().toUpperCase();
  }

  if (typeof detail.token_address === "string" && detail.token_address.trim().length > 0) {
    sanitized.token_address = detail.token_address.trim().toLowerCase();
  }

  const txValue = toNumber(detail.transaction_value);
  if (txValue !== undefined) {
    sanitized.transaction_value = txValue;
  }

  const txValueUsd = toNumber(detail.transaction_value_usd);
  if (txValueUsd !== undefined) {
    sanitized.transaction_value_usd = txValueUsd;
  }

  if (typeof detail.transaction_currency === "string" && detail.transaction_currency.trim().length > 0) {
    sanitized.transaction_currency = detail.transaction_currency.trim().toUpperCase();
  }

  if (typeof detail.transaction_type === "string" && detail.transaction_type.trim().length > 0) {
    sanitized.transaction_type = detail.transaction_type.trim().toLowerCase();
  }

  const tags = sanitizeStringArray(detail.tags);
  if (tags && tags.length > 0) {
    sanitized.tags = tags;
  }

  const featureFlags = sanitizeStringArray(detail.feature_flags ?? detail.features);
  if (featureFlags && featureFlags.length > 0) {
    sanitized.feature_flags = featureFlags;
  }

  if (typeof detail.user_agent === "string" && detail.user_agent.trim().length > 0) {
    sanitized.user_agent_hash = sha256(detail.user_agent.trim(), hashSalt);
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
    sanitized.ip_hash = sha256(detail.ip_address.trim(), ipHashSalt);
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

  UTM_FIELDS.forEach((field) => {
    const value = detail[field];
    if (typeof value === "string" && value.trim().length > 0) {
      sanitized[field] = value.trim().toLowerCase();
    }
  });

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
  
  // Get hash salts from SSM Parameter Store
  // Implements secure event emission with privacy-preserving data sanitization
  const { hashSalt, ipHashSalt } = await getHashSalts();
  const sanitizedDetail = sanitizeDetail(detail, hashSalt, ipHashSalt);

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
