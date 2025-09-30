import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Shared low-level client reused across Lambda handlers.
const lowLevelClient = new DynamoDBClient({});

// DocumentClient adds marshalling conveniences for native JS objects.
export const documentClient = DynamoDBDocumentClient.from(lowLevelClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
  },
});

// Resolve the DynamoDB table name from environment variables.
export function getTableName(): string {
  const tableName = process.env.CHAINY_TABLE_NAME;

  if (!tableName) {
    throw new Error("Missing CHAINY_TABLE_NAME environment variable");
  }

  return tableName;
}

// Shape of a link record stored inside DynamoDB.
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
