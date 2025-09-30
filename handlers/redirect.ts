import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient, getTableName, ChainyLink } from "../lib/dynamo";
import { putDomainEvent } from "../lib/events";

// Standardized JSON response wrapper for error scenarios.
function jsonResponse(statusCode: number, body: Record<string, unknown>): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
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
    void putDomainEvent({
      eventType: "link_click",
      code,
      detail: {
        target: link.target,
        owner: link.owner ?? null,
        click_at: clickTimestamp,
        user_agent: event.headers?.["user-agent"] ?? null,
        referer: event.headers?.referer ?? event.headers?.Referer ?? null,
      },
    }).catch((error) => {
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
  } catch (error) {
    console.error("Unexpected error during redirect", error);
    return jsonResponse(500, { message: "Internal server error" });
  }
}
