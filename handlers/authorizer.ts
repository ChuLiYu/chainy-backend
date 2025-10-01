import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
} from "aws-lambda";
import jwt from "jsonwebtoken";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});

// Cache the JWT secret to reduce SSM calls
let cachedSecret: string | null = null;
let secretCacheTime: number = 0;
const SECRET_CACHE_TTL = 300000; // 5 minutes

/**
 * Retrieve JWT secret from SSM Parameter Store with caching
 */
async function getJwtSecret(): Promise<string> {
  const now = Date.now();
  
  // Return cached secret if still valid
  if (cachedSecret && (now - secretCacheTime) < SECRET_CACHE_TTL) {
    return cachedSecret;
  }

  const parameterName = process.env.JWT_SECRET_PARAMETER_NAME || "/chainy/prod/jwt-secret";

  try {
    const response = await ssmClient.send(
      new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true,
      })
    );

    if (!response.Parameter?.Value) {
      throw new Error("JWT secret not found in Parameter Store");
    }

    cachedSecret = response.Parameter.Value;
    secretCacheTime = now;

    return cachedSecret;
  } catch (error) {
    console.error("Failed to retrieve JWT secret from SSM:", error);
    throw new Error("Authentication configuration error");
  }
}

/**
 * Generate IAM policy document
 */
function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
  context?: Record<string, string | number | boolean>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}

/**
 * Extract token from Authorization header
 */
function extractToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  const parts = authorizationHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }

  // Support raw token
  return authorizationHeader;
}

/**
 * Lambda Authorizer handler
 * Validates JWT tokens for API Gateway requests
 */
export async function handler(
  event: APIGatewayRequestAuthorizerEvent,
  context: Context
): Promise<APIGatewayAuthorizerResult> {
  context.callbackWaitsForEmptyEventLoop = false;

  console.log("Authorization request:", {
    methodArn: event.methodArn,
    type: event.type,
  });

  const token = extractToken(event.headers?.authorization || event.headers?.Authorization);

  if (!token) {
    console.warn("No token provided");
    throw new Error("Unauthorized"); // This will return 401
  }

  try {
    // Get JWT secret from SSM Parameter Store
    const jwtSecret = await getJwtSecret();

    // Verify the JWT token
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;

    console.log("Token verified successfully for user:", decoded.sub);

    // Extract user information from token
    const userId = decoded.sub || "unknown";
    const email = decoded.email || "";
    const name = decoded.name || "";

    // Generate Allow policy with user context
    return generatePolicy(
      userId,
      "Allow",
      event.methodArn,
      {
        userId,
        email,
        name,
        // Pass additional claims as needed
        ...(decoded.role && { role: decoded.role }),
      }
    );
  } catch (error) {
    console.error("Token verification failed:", error);

    if (error instanceof jwt.JsonWebTokenError) {
      console.warn("Invalid token:", error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.warn("Token expired:", error.message);
    }

    throw new Error("Unauthorized"); // This will return 401
  }
}

