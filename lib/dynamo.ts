import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Shared low-level client reused across Lambda handlers.
// Implements connection pooling and performance optimization for DynamoDB operations
const lowLevelClient = new DynamoDBClient({});

// DocumentClient adds marshalling conveniences for native JS objects.
// Handles automatic serialization/deserialization for seamless TypeScript integration
export const documentClient = DynamoDBDocumentClient.from(lowLevelClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
  },
});

// Resolve the DynamoDB table name from environment variables.
// Provides centralized table name resolution with proper error handling
export function getTableName(): string {
  const tableName = process.env.CHAINY_TABLE_NAME;

  if (!tableName) {
    throw new Error("Missing CHAINY_TABLE_NAME environment variable");
  }

  return tableName;
}

// Shape of a link record stored inside DynamoDB.
// Defines the data model for short link entities with analytics and ownership tracking
export interface ChainyLink {
  code: string;
  target: string;
  owner?: string;
  created_at: string;
  updated_at: string;
  clicks?: number;
  last_click_at?: string;
  wallet_address?: string;
}
