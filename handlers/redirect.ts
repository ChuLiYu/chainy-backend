import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient, getTableName, ChainyLink } from "../lib/dynamo.js";
import { putDomainEvent } from "../lib/events.js";

// Standardized JSON response wrapper for error scenarios.
function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

// Normalise header lookups (APIGW may present lower/upper case keys).
function headerLookup(event: APIGatewayProxyEventV2, name: string): string | undefined {
  const headers = event.headers ?? {};
  return headers[name] ?? headers[name.toLowerCase()];
}

// Collect metadata used for analytics (IP, geo, language, UA, etc.).
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

// Redirect handler: look up the destination, bump counters, emit analytics, return 301.
export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> {
  context.callbackWaitsForEmptyEventLoop = false;

  const code = event.pathParameters?.code;

  if (!code) {
    return jsonResponse(400, { message: "Missing short code" });
  }

  try {
    const tableName = getTableName();

    // Load the short link metadata from DynamoDB.
    const { Item } = await documentClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { code },
      }),
    );

    if (!Item) {
      return jsonResponse(404, { message: "Short link not found" });
    }

    const link = Item as ChainyLink;

    if (!link.target) {
      return jsonResponse(500, { message: "Short link target missing" });
    }

    const clickTimestamp = new Date().toISOString();

    // Increment click counters without interfering with the redirect response time.
    await documentClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { code },
        UpdateExpression: "SET last_click_at = :ts ADD clicks :inc",
        ExpressionAttributeValues: {
          ":ts": clickTimestamp,
          ":inc": 1,
        },
      }),
    );

    // Fire-and-forget write to S3 so redirects stay snappy.
    const requestMeta = extractRequestMetadata(event);

    void putDomainEvent({
      eventType: "link_click",
      code,
      detail: {
        target: link.target,
        owner: link.owner ?? null,
        click_at: clickTimestamp,
        ...requestMeta,
      },
    }).catch((error: unknown) => {
      console.error("Failed to write link_click event to S3", error);
    });

    return {
      statusCode: 301,
      headers: {
        Location: link.target,
        "Cache-Control": "no-store",
      },
      body: "",
    };
  } catch (error: unknown) {
    console.error("Unexpected error during redirect", error);
    return jsonResponse(500, { message: "Internal server error" });
  }
}
