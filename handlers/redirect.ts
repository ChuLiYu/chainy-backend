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

  const walletType = pull(headerLookup(event, "x-wallet-type"), query.wallet_type);

  const utm: Record<string, string | undefined> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((field) => {
    const candidate = query[field] ?? query[field.replace(/_(.)/g, (_, c) => c.toUpperCase())];
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

  const project = pull(query.project, query.app, query.site);
  const developerId = pull(headerLookup(event, "x-developer-id"), query.developer_id, query.dev_id);
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
    token_symbol: tokenSymbol,
    token_address: tokenAddress,
    token_decimals: tokenDecimals,
    transaction_value: transactionValue,
    transaction_value_usd: transactionValueUsd,
    transaction_currency: transactionCurrency,
    transaction_type: transactionType,
    project,
    developer_id: developerId,
    tags,
    feature_flags: featureFlags,
    ...utm,
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

    const requestMeta = extractRequestMetadata(event);

    // Fire-and-forget click analytics; errors are only logged.
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
