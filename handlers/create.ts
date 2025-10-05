import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { documentClient, getTableName, ChainyLink } from "../lib/dynamo.js";
import { putDomainEvent } from "../lib/events.js";
import { createLogger } from "../lib/logger.js";

// Initialize logger for this Lambda function
const logger = createLogger('create');

// Standard headers returned by all JSON responses.
// These headers ensure proper content type and prevent caching of sensitive API responses
const defaultHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

// Cache the JWT secret to reduce SSM calls
let cachedSecret: string | null = null;
let secretCacheTime: number = 0;
const SECRET_CACHE_TTL = 300000; // 5 minutes

// Initialize SSM client
const ssmClient = new SSMClient({ region: process.env.AWS_REGION || "ap-northeast-1" });

/**
 * Retrieve JWT secret from SSM Parameter Store with caching
 */
async function getJwtSecret(): Promise<string> {
  const now = Date.now();
  
  if (cachedSecret && (now - secretCacheTime) < SECRET_CACHE_TTL) {
    return cachedSecret;
  }

  const parameterName = process.env.JWT_SECRET_PARAMETER_NAME || "/chainy/prod/jwt-secret";

  try {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    });

    const response = await ssmClient.send(command);
    
    if (!response.Parameter?.Value) {
      throw new Error("JWT secret not found in SSM Parameter Store");
    }

    cachedSecret = response.Parameter.Value;
    secretCacheTime = now;
    
    return cachedSecret;
  } catch (error) {
    logger.error("Failed to retrieve JWT secret from SSM", {
      operation: 'getJwtSecret',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error("Failed to retrieve JWT secret");
  }
}

/**
 * Verify JWT token and extract user ID
 */
async function verifyJwtToken(authHeader: string): Promise<string> {
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Invalid authorization header format");
  }

  const token = authHeader.substring(7);
  
  try {
    const jwtSecret = await getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;

    const userId = decoded.sub;
    if (!userId) {
      throw new Error("User ID not found in token");
    }

    return userId;
  } catch (error) {
    logger.error("JWT token verification failed", {
      operation: 'verifyJwtToken',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error("Invalid or expired token");
  }
}

// Helper for crafting JSON API responses.
// Standardizes response format across all API endpoints with consistent headers
function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}

// Parse input payload, returning an empty object if no body supplied.
// Safely handles JSON parsing with proper error handling for malformed requests
function parseJsonBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body) as Record<string, unknown>;
  } catch (error) {
    throw new Error("Invalid JSON payload");
  }
}

// Generate a short alphanumeric code when the user does not supply one.
// Uses cryptographically secure random bytes for collision-resistant short codes
function generateShortCode(length = 7): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytesBuffer = randomBytes(length);

  return Array.from(randomBytesBuffer, (byte) => charset[byte % charset.length]).join("");
}

// Ensure a valid URL is provided before writing to DynamoDB.
// Validates URL format and prevents injection of malformed URLs into the system
function assertTargetUrl(target: unknown): string {
  if (typeof target !== "string" || target.trim().length === 0) {
    throw new Error("Target URL is required");
  }

  try {
    // Validate URL format – throws if invalid.
    // eslint-disable-next-line no-new
    new URL(target);
    return target;
  } catch {
    throw new Error("Target URL is invalid");
  }
}

// Normalise header lookup regardless of casing.
// API Gateway headers can be case-sensitive, this ensures consistent access
function headerLookup(event: APIGatewayProxyEventV2, name: string): string | undefined {
  const headers = event.headers ?? {};
  return headers[name] ?? headers[name.toLowerCase()];
}

const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

const SHORT_BASE_URL = process.env.CHAINY_SHORT_BASE_URL;

function resolveShortBaseUrl(event: APIGatewayProxyEventV2): string | undefined {
  if (SHORT_BASE_URL && SHORT_BASE_URL.trim().length > 0) {
    return SHORT_BASE_URL.replace(/\/$/, "");
  }

  const domainName = event.requestContext?.domainName;
  if (!domainName) {
    return undefined;
  }

  const forwardedProto = headerLookup(event, "x-forwarded-proto") ?? "https";
  const stage = event.requestContext?.stage && event.requestContext.stage !== "$default"
    ? `/${event.requestContext.stage}`
    : "";

  return `${forwardedProto}://${domainName}${stage}`.replace(/\/$/, "");
}

function appendShortUrl<T extends { code: string }>(link: T, event: APIGatewayProxyEventV2): T & { short_url?: string } {
  const base = resolveShortBaseUrl(event);

  if (!base) {
    return link;
  }

  return {
    ...link,
    short_url: `${base}/${link.code}`,
  };
}

// Collect request metadata that flows into the events pipeline.
// Extracts comprehensive analytics data from HTTP headers and query parameters for business intelligence
function extractRequestMetadata(event: APIGatewayProxyEventV2) {
  const headers = event.headers ?? {};
  const requestContext = event.requestContext;
  const http = requestContext.http ?? ({} as typeof requestContext.http);
  const query = event.queryStringParameters ?? {};

  const xForwardedFor = headerLookup(event, "x-forwarded-for");
  const sourceIp = http?.sourceIp ?? xForwardedFor?.split(",")[0]?.trim();

  const pull = (...candidates: Array<string | undefined>) =>
    candidates.find((candidate) => candidate !== undefined && candidate !== null && `${candidate}`.length > 0);

  const walletProvider = pull(
    headerLookup(event, "x-wallet-provider"),
    headerLookup(event, "x-wallet"),
    query.wallet_provider,
    query.walletProvider,
  );

  const walletSignature = pull(headerLookup(event, "x-wallet-signature"), query.wallet_signature, query.signature);
  const walletType = pull(headerLookup(event, "x-wallet-type"), query.wallet_type);

  const chainId = pull(headerLookup(event, "x-chain-id"), headerLookup(event, "x-blockchain-chainid"), query.chain_id, query.chainId, query.network);
  const dappId = pull(headerLookup(event, "x-dapp-id"), query.dapp_id, query.dappId, query.app_id);
  const integrationPartner = pull(
    headerLookup(event, "x-integration-partner"),
    headerLookup(event, "x-partner-id"),
    query.integration_partner,
    query.partner,
    query.partner_id,
  );
  const clientVersion = pull(headerLookup(event, "x-client-version"), headerLookup(event, "x-app-version"), query.client_version, query.app_version);
  const developerId = pull(headerLookup(event, "x-developer-id"), query.developer_id, query.dev_id);
  const project = pull(query.project, query.app, query.site, headerLookup(event, "x-project"));

  const utm: Record<string, string | undefined> = {};
  UTM_FIELDS.forEach((field) => {
    const camelKey = field.replace(/_(.)/g, (_, c) => c.toUpperCase());
    const candidate = query[field] ?? (camelKey in query ? query[camelKey] : undefined);
    if (candidate) {
      utm[field] = candidate;
    }
  });

  const tokenSymbol = pull(query.token_symbol, query.tokenSymbol, query.currency);
  const tokenAddress = pull(query.token_address, query.tokenAddress, query.contract);
  const tokenDecimals = pull(query.token_decimals, query.tokenDecimals);
  const transactionValue = pull(query.transaction_value, query.tx_value, query.value, query.amount);
  const transactionValueUsd = pull(query.transaction_value_usd, query.tx_value_usd, query.usd_value);
  const transactionCurrency = pull(query.transaction_currency, query.tx_currency, query.currency);
  const transactionType = pull(query.transaction_type, query.tx_type, query.action);

  const tags = pull(query.tags, query.interests);
  const featureFlags = pull(query.feature_flags, query.features);

  return {
    user_agent: headerLookup(event, "user-agent"),
    referer: headerLookup(event, "referer") ?? headerLookup(event, "referrer"),
    accept_language: headerLookup(event, "accept-language"),
    ip_address: sourceIp,
    geo_country:
      headerLookup(event, "cloudfront-viewer-country") ?? headerLookup(event, "x-appengine-country"),
    geo_region:
      headerLookup(event, "cloudfront-viewer-country-region") ?? headerLookup(event, "x-appengine-region"),
    geo_city:
      headerLookup(event, "cloudfront-viewer-city") ?? headerLookup(event, "x-appengine-city"),
    ip_asn: headerLookup(event, "cloudfront-viewer-asn"),
    wallet_provider: walletProvider,
    wallet_signature: walletSignature,
    wallet_type: walletType,
    chain_id: chainId,
    dapp_id: dappId,
    integration_partner: integrationPartner,
    client_version: clientVersion,
    developer_id: developerId,
    project,
    token_symbol: tokenSymbol,
    token_address: tokenAddress,
    token_decimals: tokenDecimals,
    transaction_value: transactionValue,
    transaction_value_usd: transactionValueUsd,
    transaction_currency: transactionCurrency,
    transaction_type: transactionType,
    tags,
    feature_flags: featureFlags,
    ...utm,
  };
}

// Entry point: multiplex CRUD operations based on HTTP method.
// Routes incoming requests to appropriate handler functions based on HTTP verb
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();

  try {
    switch (method) {
      case "POST":
        return await handleCreate(event);
      case "PUT":
        return await handleUpdate(event);
      case "GET":
        return await handleGet(event);
      case "DELETE":
        return await handleDelete(event);
      default:
        return jsonResponse(405, { message: `Unsupported method: ${method}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isClientError =
      message.includes("Invalid JSON") ||
      message.includes("Target URL") ||
      message.includes("Custom code");
    const statusCode = isClientError ? 400 : 500;

    return jsonResponse(statusCode, { message });
  }
}

async function handleCreate(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const payload = parseJsonBody(event);
  const target = assertTargetUrl(payload.target);
  
  // Get user ID from Authorization header for authenticated users
  const authHeader = headerLookup(event, "authorization");
  let owner: string | undefined;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      owner = await verifyJwtToken(authHeader);
    } catch (error) {
      return jsonResponse(401, { message: "Invalid or expired token" });
    }
  }
  
  const requestedCode = typeof payload.code === "string" ? payload.code.trim() : undefined;
  const walletAddress = typeof payload.wallet_address === "string" ? payload.wallet_address : undefined;

  const code = (() => {
    if (!requestedCode || requestedCode.length === 0) {
      return generateShortCode();
    }

    const normalised = requestedCode.toString().trim();
    if (!/^[a-zA-Z0-9_-]{4,32}$/.test(normalised)) {
      throw new Error("Custom code must be 4-32 characters of letters, numbers, '-' or '_'");
    }

    return normalised;
  })();
  const timestamp = new Date().toISOString();

  const item: ChainyLink = {
    code,
    target,
    owner,
    wallet_address: walletAddress,
    created_at: timestamp,
    updated_at: timestamp,
    clicks: 0,
  };

  try {
    // Only allow creation if the code does not already exist.
    // Uses DynamoDB conditional write to prevent duplicate short codes
    await documentClient.send(
      new PutCommand({
        TableName: getTableName(),
        Item: item,
        ConditionExpression: "attribute_not_exists(code)",
      }),
    );
  } catch (error) {
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
      return jsonResponse(409, { message: "Short code already exists" });
    }

    throw error;
  }

  const requestMeta = extractRequestMetadata(event);
  const payloadMeta: Record<string, unknown> = {};

  if (typeof payload.wallet_provider === "string") {
    payloadMeta.wallet_provider = payload.wallet_provider;
  }

  if (typeof payload.wallet_signature === "string") {
    payloadMeta.wallet_signature = payload.wallet_signature;
  }

  if (typeof payload.wallet_type === "string") {
    payloadMeta.wallet_type = payload.wallet_type;
  }

  if (typeof payload.chain_id === "string") {
    payloadMeta.chain_id = payload.chain_id;
  }

  if (typeof payload.dapp_id === "string") {
    payloadMeta.dapp_id = payload.dapp_id;
  }

  if (typeof payload.integration_partner === "string") {
    payloadMeta.integration_partner = payload.integration_partner;
  }

  if (typeof payload.client_version === "string") {
    payloadMeta.client_version = payload.client_version;
  }

  if (typeof payload.project === "string") {
    payloadMeta.project = payload.project;
  }

  if (typeof payload.developer_id === "string") {
    payloadMeta.developer_id = payload.developer_id;
  }

  if (typeof payload.token_symbol === "string") {
    payloadMeta.token_symbol = payload.token_symbol;
  }

  if (typeof payload.token_address === "string") {
    payloadMeta.token_address = payload.token_address;
  }

  if (payload.token_decimals !== undefined) {
    payloadMeta.token_decimals = payload.token_decimals;
  }

  if (payload.transaction_value !== undefined) {
    payloadMeta.transaction_value = payload.transaction_value;
  }

  if (payload.transaction_value_usd !== undefined) {
    payloadMeta.transaction_value_usd = payload.transaction_value_usd;
  }

  if (typeof payload.transaction_currency === "string") {
    payloadMeta.transaction_currency = payload.transaction_currency;
  }

  if (typeof payload.transaction_type === "string") {
    payloadMeta.transaction_type = payload.transaction_type;
  }

  if (payload.tags !== undefined) {
    payloadMeta.tags = payload.tags;
  }

  if (payload.feature_flags !== undefined) {
    payloadMeta.feature_flags = payload.feature_flags;
  }

  try {
    // Emit domain event for analytics and audit trail
    // Fire-and-forget pattern ensures redirect performance isn't affected
    await putDomainEvent({
      eventType: "link_create",
      code,
      detail: {
        target,
        owner: owner ?? null,
        wallet_address: walletAddress ?? null,
        created_at: timestamp,
        ...requestMeta,
        ...payloadMeta,
      },
    });
  } catch (error: unknown) {
    // S3 event logging failed - non-critical error
  }

  return jsonResponse(201, appendShortUrl(
    {
      code,
      target,
      owner,
      wallet_address: walletAddress,
      created_at: timestamp,
      updated_at: timestamp,
    },
    event,
  ));
}

async function handleUpdate(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const code = event.pathParameters?.code;

  if (!code) {
    return jsonResponse(400, { message: "Path parameter 'code' is required" });
  }

  const payload = parseJsonBody(event);
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {
    ":updated_at": new Date().toISOString(),
  };
  const expressionAttributeNames: Record<string, string> = {
    "#updated_at": "updated_at",
  };

  if (payload.target) {
    expressionAttributeNames["#target"] = "target";
    expressionAttributeValues[":target"] = assertTargetUrl(payload.target);
    updateExpressions.push("#target = :target");
  }

  if (payload.owner !== undefined) {
    expressionAttributeNames["#owner"] = "owner";
    expressionAttributeValues[":owner"] = typeof payload.owner === "string" ? payload.owner : null;
    updateExpressions.push("#owner = :owner");
  }

  if (payload.wallet_address !== undefined) {
    expressionAttributeNames["#wallet_address"] = "wallet_address";
    expressionAttributeValues[":wallet_address"] =
      typeof payload.wallet_address === "string" ? payload.wallet_address : null;
    updateExpressions.push("#wallet_address = :wallet_address");
  }

  if (updateExpressions.length === 0) {
    return jsonResponse(400, { message: "No valid fields to update" });
  }

  const updateExpression = `SET ${updateExpressions.join(", ")}, #updated_at = :updated_at`;

  // Apply a conditional update so missing codes return a friendly error.
  const result = await documentClient.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { code },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ConditionExpression: "attribute_exists(code)",
      ReturnValues: "ALL_NEW",
    }),
  );

  const link = result.Attributes as ChainyLink | undefined;

  if (!link) {
    return jsonResponse(404, { message: "Short link not found" });
  }

  void putDomainEvent({
    eventType: "link_update",
    code,
    detail: {
      target: link.target,
      owner: link.owner ?? null,
      wallet_address: link.wallet_address ?? null,
      updated_at: link.updated_at,
      ...extractRequestMetadata(event),
    },
  }).catch((error: unknown) => {
    // S3 event logging failed - non-critical error
  });

  return jsonResponse(200, appendShortUrl(link, event));
}

async function handleGet(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const code = event.pathParameters?.code;

  // If no code parameter, this is a request for user's links list
  if (!code) {
    return await handleGetUserLinks(event);
  }

  // Fetch the latest version of the short link.
  const { Item } = await documentClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { code },
    }),
  );

  if (!Item) {
    return jsonResponse(404, { message: "Short link not found" });
  }

  return jsonResponse(200, appendShortUrl(Item as ChainyLink, event));
}

async function handleGetUserLinks(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  // Get user ID from Authorization header
  const authHeader = headerLookup(event, "authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse(401, { message: "Authorization header required" });
  }

  let userId: string;
  try {
    userId = await verifyJwtToken(authHeader);
  } catch (error) {
    return jsonResponse(401, { message: "Invalid or expired token" });
  }

  try {
    // Scan DynamoDB for links owned by this user and not soft-deleted
    const { Items } = await documentClient.send(
      new ScanCommand({
        TableName: getTableName(),
        FilterExpression: "#owner = :owner AND attribute_not_exists(deleted_at)",
        ExpressionAttributeNames: {
          "#owner": "owner",
        },
        ExpressionAttributeValues: {
          ":owner": userId,
        },
      }),
    );

    if (!Items || Items.length === 0) {
      return jsonResponse(200, { links: [] });
    }

    // Sort by creation time descending
    const sortedItems = Items.sort((a, b) => {
      const timeA = new Date(a.created_at as string).getTime();
      const timeB = new Date(b.created_at as string).getTime();
      return timeB - timeA;
    });

    // Add short_url to each link
    const linksWithUrls = sortedItems.map((link) => appendShortUrl(link as ChainyLink, event));

    return jsonResponse(200, { links: linksWithUrls });
  } catch (error) {
    return jsonResponse(500, { message: "Failed to fetch user links" });
  }
}

async function handleDelete(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const code = event.pathParameters?.code;

  if (!code) {
    return jsonResponse(400, { message: "Path parameter 'code' is required" });
  }

  // Soft delete: add deleted_at timestamp instead of removing the record
  const result = await documentClient.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { code },
      UpdateExpression: "SET deleted_at = :deleted_at, #updated_at = :updated_at",
      ExpressionAttributeNames: {
        "#updated_at": "updated_at",
      },
      ExpressionAttributeValues: {
        ":deleted_at": new Date().toISOString(),
        ":updated_at": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(code) AND attribute_not_exists(deleted_at)",
      ReturnValues: "ALL_NEW",
    }),
  );

  const link = result.Attributes as ChainyLink | undefined;

  if (!link) {
    return jsonResponse(404, { message: "Short link not found or already deleted" });
  }

  void putDomainEvent({
    eventType: "link_delete",
    code,
    detail: {
      owner: link.owner ?? null,
      deleted_at: link.deleted_at,
      ...extractRequestMetadata(event),
    },
  }).catch((error: unknown) => {
    // S3 event logging failed - non-critical error
  });

  return {
    statusCode: 204,
    headers: defaultHeaders,
    body: "",
  };
}
