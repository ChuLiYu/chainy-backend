import test from "node:test";
import assert from "node:assert/strict";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { buildObjectKey, putDomainEvent } from "../lib/events.ts";

test("buildObjectKey partitions by event type and timestamp", () => {
  const timestamp = new Date("2024-09-30T13:45:12.000Z");
  const key = buildObjectKey("link_click", "abc123", timestamp);

  assert.equal(key, "link_click/dt=2024-09-30/hour=13/abc123-1727703912000.jsonl");
});

test("putDomainEvent writes JSONL payload to the expected bucket/key", async () => {
  const originalBucket = process.env.CHAINY_EVENTS_BUCKET_NAME;
  const originalEnv = process.env.CHAINY_ENVIRONMENT;

  process.env.CHAINY_EVENTS_BUCKET_NAME = "chainy-events-dev";
  process.env.CHAINY_ENVIRONMENT = "dev";

  const commands: PutObjectCommand[] = [];
  const fakeClient = {
    send: async (command: PutObjectCommand) => {
      commands.push(command);
      return {};
    },
  } as const;

  await putDomainEvent(
    {
      eventType: "link_create",
      code: "abc123",
      detail: { target: "https://example.com" },
    },
    fakeClient,
  );

  assert.equal(commands.length, 1, "expected a single PutObjectCommand");

  const command = commands[0];
  assert.equal(command.input.Bucket, "chainy-events-dev");
  assert.match(
    command.input.Key ?? "",
    /link_create\/dt=\d{4}-\d{2}-\d{2}\/hour=\d{2}\/abc123-\d+\.jsonl/,
  );

  const body = command.input.Body?.toString() ?? "";
  const parsed = JSON.parse(body);
  assert.equal(parsed.event_type, "link_create");
  assert.equal(parsed.code, "abc123");
  assert.equal(parsed.target, "https://example.com");
  assert.equal(parsed.environment, "dev");
  assert.ok(parsed.emitted_at, "emitted_at should be present");

  if (originalBucket === undefined) {
    delete process.env.CHAINY_EVENTS_BUCKET_NAME;
  } else {
    process.env.CHAINY_EVENTS_BUCKET_NAME = originalBucket;
  }

  if (originalEnv === undefined) {
    delete process.env.CHAINY_ENVIRONMENT;
  } else {
    process.env.CHAINY_ENVIRONMENT = originalEnv;
  }
});

test("putDomainEvent throws if events bucket env var missing", async () => {
  const originalBucket = process.env.CHAINY_EVENTS_BUCKET_NAME;
  delete process.env.CHAINY_EVENTS_BUCKET_NAME;

  await assert.rejects(
    () =>
      putDomainEvent({
        eventType: "link_delete",
        code: "xyz",
        detail: {},
      }),
    /CHAINY_EVENTS_BUCKET_NAME/,
  );

  if (originalBucket === undefined) {
    delete process.env.CHAINY_EVENTS_BUCKET_NAME;
  } else {
    process.env.CHAINY_EVENTS_BUCKET_NAME = originalBucket;
  }
});
