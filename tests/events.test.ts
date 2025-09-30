import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "crypto";
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
      detail: {
        target: "https://example.com/docs?token=abc",
        owner: "alice",
        wallet_address: "0x1234567890abcdef",
        user_agent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        referer: "https://ref.example.com/page?utm=1",
        ip_address: "203.0.113.9",
        accept_language: "en-CA,en;q=0.9",
        geo_country: "CA",
        geo_region: "QC",
        geo_city: "Montreal",
        ip_asn: "AS12345",
      },
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
  assert.equal(parsed.target, "https://example.com/docs");
  assert.equal(parsed.environment, "dev");
  assert.ok(parsed.emitted_at, "emitted_at should be present");
  assert.equal(parsed.wallet_address_masked, "0x12***cdef");
  assert.equal(parsed.referer_origin, "https://ref.example.com/page");
  const ua =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  assert.equal(parsed.user_agent_hash, createHash("sha256").update(ua).digest("hex"));
  assert.equal(parsed.owner_hash, createHash("sha256").update("alice").digest("hex"));
  assert.equal(parsed.sensitive_redacted, true);
  assert.equal(parsed.target, "https://example.com/docs");
  assert.equal(parsed.geo_country, "CA");
  assert.equal(parsed.geo_region, "QC");
  assert.equal(parsed.geo_city, "Montreal");
  assert.equal(parsed.ip_asn, "AS12345");
  assert.equal(parsed.user_language, "en-CA");
  assert.equal(parsed.ip_hash, createHash("sha256").update("203.0.113.9").digest("hex"));
  assert.ok(parsed.device_type);
  assert.ok(parsed.os_family);
  assert.ok(parsed.browser_family);
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "owner"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "wallet_address"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "user_agent"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "referer"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "ip_address"));

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
