import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomBytes } from "crypto";
import { documentClient, getTableName, ChainyLink } from "../lib/dynamo.js";
import { putDomainEvent } from "../lib/events.js";

// Standard headers returned by all JSON responses.
const defaultHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

// Normalise header lookup regardless of casing.
function headerLookup(event: APIGatewayProxyEventV2, name: string): string | undefined {
  const headers = event.headers ?? {};
  return headers[name] ?? headers[name.toLowerCase()];
}

// Collect request metadata that flows into the events pipeline.
function extractRequestMetadata(event: APIGatewayProxyEventV2) {
  const headers = event.headers ?? {};
  const requestContext = event.requestContext;
  const http = requestContext.http ?? ({} as typeof requestContext.http);

  const xForwardedFor = headerLookup(event, "x-forwarded-for");
  const sourceIp = http?.sourceIp ?? xForwardedFor?.split(",")[0]?.trim();

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
  };
}

// Helper for crafting JSON API responses.
function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}

// Parse input payload, returning an empty object if no body supplied.
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
function generateShortCode(length = 7): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytesBuffer = randomBytes(length);

  return Array.from(randomBytesBuffer, (byte) => charset[byte % charset.length]).join("");
}


// Ensure a valid URL is provided before writing to DynamoDB.
function assertTargetUrl(target: unknown): string {
  if (typeof target !== "string" || target.trim().length === 0) {
    throw new Error("Target URL is required");
  }

  try {
    new URL(target);
    return target;
  } catch {
    throw new Error("Target URL is invalid");
  }
}

// Entry point: multiplex CRUD operations based on HTTP method.
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
    const isClientError = message.includes("Invalid JSON") || message.includes("Target URL");
    const statusCode = isClientError ? 400 : 500;

    console.error(`Error handling ${method} request`, error);

    return jsonResponse(statusCode, { message });
  }
}

async function handleCreate(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const payload = parseJsonBody(event);
  const target = assertTargetUrl(payload.target);
  const owner = typeof payload.owner === "string" ? payload.owner : undefined;
  const requestedCode = typeof payload.code === "string" ? payload.code.trim() : undefined;
  const walletAddress = typeof payload.wallet_address === "string" ? payload.wallet_address : undefined;
  const code = requestedCode && requestedCode.length > 0 ? requestedCode : generateShortCode();
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

  try {
    await putDomainEvent({
      eventType: "link_create",
      code,
      detail: {
        target,
        owner: owner ?? null,
        wallet_address: walletAddress ?? null,
        created_at: timestamp,
        ...extractRequestMetadata(event),
      },
    });
  } catch (error: unknown) {
    console.error("Failed to write link_create event to S3", error);
  }

  return jsonResponse(201, {
    code,
    target,
    owner,
    wallet_address: walletAddress,
    created_at: timestamp,
    updated_at: timestamp,
  });
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
    console.error("Failed to write link_update event to S3", error);
  });

  return jsonResponse(200, link);
}

async function handleGet(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const code = event.pathParameters?.code;

  if (!code) {
    return jsonResponse(400, { message: "Path parameter 'code' is required" });
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

  return jsonResponse(200, Item as ChainyLink);
}

async function handleDelete(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const code = event.pathParameters?.code;

  if (!code) {
    return jsonResponse(400, { message: "Path parameter 'code' is required" });
  }

  // Remove the record while ensuring it existed beforehand.
  const result = await documentClient.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { code },
      ReturnValues: "ALL_OLD",
      ConditionExpression: "attribute_exists(code)",
    }),
  );

  const link = result.Attributes as ChainyLink | undefined;

  if (!link) {
    return jsonResponse(404, { message: "Short link not found" });
  }

  void putDomainEvent({
    eventType: "link_delete",
    code,
    detail: {
      owner: link.owner ?? null,
      deleted_at: new Date().toISOString(),
      ...extractRequestMetadata(event),
    },
  }).catch((error: unknown) => {
    console.error("Failed to write link_delete event to S3", error);
  });

  return {
    statusCode: 204,
    headers: defaultHeaders,
    body: "",
  };
}
