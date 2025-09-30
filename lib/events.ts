import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({});

function getEventsBucketName(): string {
  const bucket = process.env.CHAINY_EVENTS_BUCKET_NAME;

  if (!bucket) {
    throw new Error("Missing CHAINY_EVENTS_BUCKET_NAME environment variable");
  }

  return bucket;
}

export interface PutEventParams {
  eventType: string;
  code: string;
  detail: Record<string, unknown>;
}

export function buildObjectKey(eventType: string, code: string, timestamp: Date): string {
  const iso = timestamp.toISOString();
  const [datePart, timePart] = iso.split("T");
  const hour = timePart.slice(0, 2);

  return `${eventType}/dt=${datePart}/hour=${hour}/${code}-${timestamp.getTime()}.jsonl`;
}

export async function putDomainEvent(
  { eventType, code, detail }: PutEventParams,
  client: Pick<S3Client, "send"> = s3Client,
): Promise<void> {
  const bucket = getEventsBucketName();
  const environment = process.env.CHAINY_ENVIRONMENT ?? "unknown";
  const timestamp = new Date();
  const key = buildObjectKey(eventType, code, timestamp);

  const payload = {
    event_type: eventType,
    code,
    environment,
    emitted_at: timestamp.toISOString(),
    ...detail,
  };

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: `${JSON.stringify(payload)}\n`,
      ContentType: "application/json",
    }),
  );
}
