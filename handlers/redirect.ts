import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient, getTableName, ChainyLink } from "../lib/dynamo.js";
import { putDomainEvent } from "../lib/events.js";
import { createLogger } from "../lib/logger.js";

// Initialize logger for this Lambda function
const logger = createLogger('redirect');

// Standardized JSON response wrapper for error scenarios.
// Ensures consistent error response format across all redirect failures
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
// Handles case-insensitive header access for consistent behavior across environments
function headerLookup(event: APIGatewayProxyEventV2, name: string): string | undefined {
  const headers = event.headers ?? {};
  return headers[name] ?? headers[name.toLowerCase()];
}

// Collect metadata used for analytics (IP, geo, language, UA, etc.).
// Extracts comprehensive click analytics data for business intelligence and fraud detection
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

/**
 * Check if service is paused or in emergency stop mode
 * Returns appropriate error response if service is disabled
 */
function checkServiceStatus(): APIGatewayProxyResultV2 | null {
  const servicePaused = process.env.SERVICE_PAUSED === "true";
  const emergencyStop = process.env.EMERGENCY_STOP === "true";
  
  if (emergencyStop) {
    const reason = process.env.EMERGENCY_REASON || "緊急停止";
    const timestamp = process.env.EMERGENCY_TIMESTAMP || "未知時間";
    
    logger.warn("Service is in emergency stop mode", {
      operation: 'checkServiceStatus',
      reason,
      timestamp
    });
    
    return {
      statusCode: 503,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      },
      body: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>服務暫時停止 - Chainy</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #ff6b6b;
      font-size: 48px;
      margin: 0 0 10px 0;
    }
    p {
      color: #666;
      font-size: 18px;
      margin: 20px 0;
    }
    .reason {
      background: #ffe6e6;
      padding: 20px;
      border-radius: 8px;
      font-size: 16px;
      color: #d63031;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚨</h1>
    <p>服務暫時停止</p>
    <div class="reason">
      <strong>原因：</strong>${reason}<br>
      <strong>時間：</strong>${timestamp}
    </div>
    <p>我們正在處理緊急情況，請稍後再試</p>
  </div>
</body>
</html>`,
    };
  }
  
  if (servicePaused) {
    const reason = process.env.PAUSE_REASON || "服務維護";
    const timestamp = process.env.PAUSE_TIMESTAMP || "未知時間";
    
    logger.info("Service is paused", {
      operation: 'checkServiceStatus',
      reason,
      timestamp
    });
    
    return {
      statusCode: 503,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      },
      body: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>服務維護中 - Chainy</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #fdcb6e;
      font-size: 48px;
      margin: 0 0 10px 0;
    }
    p {
      color: #666;
      font-size: 18px;
      margin: 20px 0;
    }
    .reason {
      background: #fff3cd;
      padding: 20px;
      border-radius: 8px;
      font-size: 16px;
      color: #856404;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⏸️</h1>
    <p>服務維護中</p>
    <div class="reason">
      <strong>原因：</strong>${reason}<br>
      <strong>時間：</strong>${timestamp}
    </div>
    <p>我們正在進行系統維護，請稍後再試</p>
  </div>
</body>
</html>`,
    };
  }
  
  return null;
}

// Redirect handler: look up the destination, bump counters, emit analytics, return 301.
// Core redirect logic with click tracking and analytics event emission
export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> {
  context.callbackWaitsForEmptyEventLoop = false;

  // Check service status first
  const serviceStatusCheck = checkServiceStatus();
  if (serviceStatusCheck) {
    return serviceStatusCheck;
  }

  const code = event.pathParameters?.code;
  
  // Handle root path - redirect to frontend
  // Provides a landing page for users accessing the base domain
  if (!code || code === "" || code === "/") {
    const webDomain = process.env.WEB_DOMAIN;
    const webSubdomain = process.env.WEB_SUBDOMAIN || "chainy";
    const fullDomain = webDomain ? `https://${webSubdomain}.${webDomain}` : "";
    
    // If web domain is configured, redirect to index.html
    if (fullDomain) {
      return {
        statusCode: 302,
        headers: {
          Location: `${fullDomain}/index.html`,
          "Cache-Control": "no-store",
        },
        body: "",
      };
    }
    
    // Return a simple welcome page for root path
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      },
      body: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chainy - 短網址服務</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #667eea;
      font-size: 48px;
      margin: 0 0 10px 0;
    }
    p {
      color: #666;
      font-size: 18px;
      margin: 20px 0;
    }
    .api-info {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      color: #333;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>CHAINY</h1>
    <p>短網址生成服務</p>
    <div class="api-info">
      <strong>API 端點：</strong><br>
      POST /links - 創建短網址<br>
      GET /{code} - 重定向到目標網址<br>
      GET /links/{code} - 獲取短網址資訊
    </div>
    <p>需要 JWT 認證才能創建短網址</p>
  </div>
</body>
</html>`,
    };
  }

  try {
    const tableName = getTableName();

    // Load the short link metadata from DynamoDB.
    // Primary lookup to retrieve target URL and validate link existence
    const { Item } = await documentClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { code },
      }),
    );

    if (!Item) {
      // Check if request accepts HTML (from browser)
      const acceptHeader = event.headers?.accept || event.headers?.Accept || "";
      const isFromBrowser = acceptHeader.includes("text/html");
      
      if (isFromBrowser) {
        // Return HTML page for browser requests
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": "no-store",
          },
          body: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>短網址不存在 - Chainy</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #667eea;
      font-size: 48px;
      margin: 0 0 10px 0;
    }
    p {
      color: #666;
      font-size: 18px;
      margin: 20px 0;
    }
    .code {
      background: #f5f5f5;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 16px;
      color: #333;
      margin: 20px 0;
    }
    a {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 15px 30px;
      border-radius: 10px;
      font-weight: bold;
      margin-top: 20px;
      transition: transform 0.2s;
    }
    a:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>抱歉，找不到這個短網址</p>
    <div class="code">/${code}</div>
    <p>這個短網址可能已過期或不存在</p>
    <a href="/">建立新的短網址</a>
  </div>
</body>
</html>`,
        };
      }
      
      // Return JSON for API requests
      return jsonResponse(404, { message: "Short link not found" });
    }

    const link = Item as ChainyLink;

    if (!link.target) {
      return jsonResponse(500, { message: "Short link target missing" });
    }

    const clickTimestamp = new Date().toISOString();

    // Increment click counters without interfering with the redirect response time.
    // Uses atomic counter update to track click statistics accurately
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
    // Analytics events are emitted asynchronously to maintain redirect performance
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
      // S3 event logging failed - non-critical error
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
    logger.error("Unexpected error during redirect", {
      operation: 'redirect',
      code: event.pathParameters?.code,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return jsonResponse(500, { message: "Internal server error" });
  }
}
