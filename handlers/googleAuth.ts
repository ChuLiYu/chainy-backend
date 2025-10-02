import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import jwt from "jsonwebtoken";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ssmClient = new SSMClient({});
const dynamoClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    // DynamoDB does not accept undefined or empty string attributes
    convertEmptyValues: true,
    removeUndefinedValues: true,
  },
});

// Cache the JWT secret to reduce SSM calls
let cachedSecret: string | null = null;
let secretCacheTime: number = 0;
const SECRET_CACHE_TTL = 300000; // 5 minutes

// Standard headers returned by all JSON responses.
const defaultHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

// Helper for crafting JSON API responses.
function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}

type GoogleUser = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean | string;
};

type UserRecord = {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
};

function sanitizeUserRecord(record: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(record)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (trimmed.length === 0) {
        continue;
      }
      cleaned[key] = trimmed;
      continue;
    }

    cleaned[key] = rawValue;
  }

  return cleaned;
}

function resolveUserName(googleUser: GoogleUser): string {
  if (googleUser.name && googleUser.name.trim().length > 0) {
    return googleUser.name.trim();
  }

  if (googleUser.email && googleUser.email.trim().length > 0) {
    return googleUser.email.trim();
  }

  return "Google User";
}

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
 * Exchange OAuth code for user info
 */
async function exchangeCodeForToken(code: string, redirectUri?: string, codeVerifier?: string): Promise<any> {
  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }

    const resolvedRedirectUri = redirectUri
      || process.env.GOOGLE_REDIRECT_URI
      || 'http://localhost:3000/google-auth-callback.html';

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: resolvedRedirectUri
    });

    if (codeVerifier) {
      tokenParams.append('code_verifier', codeVerifier);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error("Failed to exchange OAuth code");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info using access token
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      throw new Error("Failed to get user info");
    }

    const userInfo = await userResponse.json();
    
    return {
      sub: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      email_verified: userInfo.verified_email,
      aud: GOOGLE_CLIENT_ID,
      iss: 'https://accounts.google.com',
      azp: GOOGLE_CLIENT_ID,
      given_name: userInfo.given_name,
      family_name: userInfo.family_name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
  } catch (error) {
    console.error("OAuth code exchange failed:", error);
    throw new Error("Invalid OAuth code");
  }
}

/**
 * Verify Google ID Token
 * @param googleToken - Google ID Token
 * @returns Google user information
 */
async function verifyGoogleToken(googleToken: string): Promise<any> {
  try {
    // Validate the ID token against the Google public endpoint
    // Simplified for this project; production workloads should rely on the official Google verification library
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`);
    
    if (!response.ok) {
      throw new Error("Invalid Google token");
    }

    const tokenInfo = await response.json();
    
    // Confirm that the token audience (aud) matches our configured client id
    const expectedAudience = process.env.GOOGLE_CLIENT_ID;
    if (tokenInfo.aud !== expectedAudience) {
      throw new Error("Token audience mismatch");
    }

    return {
      sub: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name,
      picture: tokenInfo.picture,
      email_verified: tokenInfo.email_verified === "true",
    };
  } catch (error) {
    console.error("Google token verification failed:", error);
    throw new Error("Invalid Google token");
  }
}

/**
 * Get or create user in DynamoDB
 * @param googleUser - Google user information
 * @returns User record
 */
async function getOrCreateUser(googleUser: GoogleUser): Promise<UserRecord> {
  const tableName = process.env.USERS_TABLE_NAME || "chainy-users";
  const userId = googleUser.sub;

  if (!googleUser.email) {
    throw new Error("Invalid Google user payload: email missing");
  }

  try {
    // Try to get existing user
    const getResult = await documentClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { userId: userId },
      })
    );

    if (getResult.Item) {
      // Update user info if needed
      const existingUser = getResult.Item as UserRecord;
      const needsUpdate = 
        existingUser.email !== googleUser.email ||
        existingUser.name !== resolveUserName(googleUser) ||
        existingUser.picture !== googleUser.picture;

      const timestamp = new Date().toISOString();

      if (needsUpdate) {
        const updatedRecord = sanitizeUserRecord({
          ...existingUser,
          email: googleUser.email,
          name: resolveUserName(googleUser),
          picture: googleUser.picture,
          updated_at: timestamp,
          last_login_at: timestamp,
        });

        await documentClient.send(
          new PutCommand({
            TableName: tableName,
            Item: updatedRecord,
          })
        );

        return updatedRecord as UserRecord;
      }

      const loginRefreshedRecord = sanitizeUserRecord({
        ...existingUser,
        last_login_at: timestamp,
      });

      await documentClient.send(
        new PutCommand({
          TableName: tableName,
          Item: loginRefreshedRecord,
        })
      );

      return loginRefreshedRecord as UserRecord;
    }

    // Create new user
    const timestamp = new Date().toISOString();
    const newUser = sanitizeUserRecord({
      userId: userId,
      email: googleUser.email,
      name: resolveUserName(googleUser),
      picture: googleUser.picture,
      provider: "google",
      created_at: timestamp,
      updated_at: timestamp,
      last_login_at: timestamp,
    });

    await documentClient.send(
      new PutCommand({
        TableName: tableName,
        Item: newUser,
      })
    );

    return newUser as UserRecord;
  } catch (error) {
    console.error("Failed to get or create user:", error);
    throw new Error("User management error");
  }
}

/**
 * Generate JWT token for authenticated user
 * @param user - User information
 * @returns JWT token
 */
async function generateJwtToken(user: any): Promise<string> {
  const jwtSecret = await getJwtSecret();
  
  const payload = {
    sub: user.userId,
    email: user.email,
    name: user.name,
    provider: user.provider || "google",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  };

  return jwt.sign(payload, jwtSecret, { algorithm: "HS256" });
}

/**
 * Handle CORS preflight requests
 */
function handleCors(event: APIGatewayProxyEventV2): APIGatewayProxyResultV2 | null {
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: "",
    };
  }
  return null;
}

/**
 * Main handler for Google authentication
 */
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  console.log("Google auth request:", JSON.stringify(event, null, 2));

  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Parse request body
    if (!event.body) {
      return jsonResponse(400, { message: "Request body is required" });
    }

    const body = JSON.parse(event.body);
    const { googleToken, provider, tokenType, redirectUri, codeVerifier } = body;

    if (!googleToken) {
      return jsonResponse(400, { message: "Google token is required" });
    }

    if (provider !== "google") {
      return jsonResponse(400, { message: "Only Google provider is supported" });
    }

    // Verify Google token or exchange OAuth code
    let googleUser;
    if (tokenType === 'code') {
      googleUser = await exchangeCodeForToken(googleToken, redirectUri, codeVerifier);
    } else {
      googleUser = await verifyGoogleToken(googleToken);
    }

    if (!googleUser.email_verified) {
      return jsonResponse(400, { message: "Email not verified" });
    }

    // Get or create user
    const user = await getOrCreateUser(googleUser);

    // Generate JWT token
    const jwtToken = await generateJwtToken(user);

    console.log("Google authentication successful for user:", user.email);

    return jsonResponse(200, {
      jwt: jwtToken,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: user.provider,
      },
    });

  } catch (error) {
    console.error("Google authentication error:", error);
    
    const message = error instanceof Error ? error.message : "Authentication failed";
    const statusCode = message.includes("Invalid") || message.includes("required") ? 400 : 500;
    
    return jsonResponse(statusCode, { message });
  }
}
