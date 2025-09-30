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
  const originalSalt = process.env.CHAINY_HASH_SALT;

  process.env.CHAINY_EVENTS_BUCKET_NAME = "chainy-events-dev";
  process.env.CHAINY_ENVIRONMENT = "dev";
  delete process.env.CHAINY_HASH_SALT;

  const commands: PutObjectCommand[] = [];
  const fakeClient = {
    send: async (command: PutObjectCommand) => {
      commands.push(command);
      return {};
    },
  } as const;

  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  await putDomainEvent(
    {
      eventType: "link_create",
      code: "abc123",
      detail: {
        target: "https://example.com/docs?token=abc",
        owner: "alice",
        wallet_address: "0x1234567890abcdef",
        wallet_signature: "0xsig",
        wallet_provider: "MetaMask",
        wallet_type: "extension",
        chain_id: "0x1",
        dapp_id: "dapp-xyz",
        integration_partner: "co-marketing-partner",
        client_version: "2.3.4",
        developer_id: "dev-777",
        project: "ChainyInsights",
        token_symbol: "usdc",
        token_address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        token_decimals: "6",
        transaction_value: "123.456789",
        transaction_value_usd: "123.50",
        transaction_currency: "usdc",
        transaction_type: "swap",
        tags: ["defi", "nft"],
        feature_flags: "beta-users,whale-tier",
        user_agent: userAgent,
        referer: "https://ref.example.com/page?utm=1",
        ip_address: "203.0.113.9",
        accept_language: "en-CA,en;q=0.9",
        geo_country: "CA",
        geo_region: "QC",
        geo_city: "Montreal",
        ip_asn: "AS12345",
        utm_source: "Newsletter",
        utm_medium: "Email",
        utm_campaign: "Launch",
        utm_content: "HeroBanner",
        utm_term: "Keyword",
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
  assert.equal(parsed.wallet_provider, "metamask");
  assert.equal(parsed.wallet_type, "extension");
  assert.equal(parsed.chain_id, "0x1");
  assert.equal(parsed.dapp_id, "dapp-xyz");
  assert.equal(parsed.integration_partner, "co-marketing-partner");
  assert.equal(parsed.client_version, "2.3.4");
  assert.equal(parsed.developer_id, "dev-777");
  assert.equal(parsed.project, "ChainyInsights");
  assert.equal(parsed.token_symbol, "USDC");
  assert.equal(parsed.token_address, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  assert.equal(parsed.token_decimals, "6");
  assert.equal(parsed.transaction_value, 123.456789);
  assert.equal(parsed.transaction_value_usd, 123.5);
  assert.equal(parsed.transaction_currency, "USDC");
  assert.equal(parsed.transaction_type, "swap");
  assert.deepEqual(parsed.tags, ["defi", "nft"]);
  assert.deepEqual(parsed.feature_flags, ["beta-users", "whale-tier"]);
  assert.equal(parsed.referer_origin, "https://ref.example.com/page");
  assert.equal(parsed.user_agent_hash, createHash("sha256").update(userAgent).digest("hex"));
  assert.equal(parsed.owner_hash, createHash("sha256").update("alice").digest("hex"));
  assert.equal(parsed.ip_hash, createHash("sha256").update("203.0.113.9").digest("hex"));
  assert.equal(parsed.geo_country, "CA");
  assert.equal(parsed.geo_region, "QC");
  assert.equal(parsed.geo_city, "Montreal");
  assert.equal(parsed.ip_asn, "AS12345");
  assert.equal(parsed.user_language, "en-CA");
  assert.equal(parsed.utm_source, "newsletter");
  assert.equal(parsed.utm_medium, "email");
  assert.equal(parsed.utm_campaign, "launch");
  assert.equal(parsed.utm_content, "herobanner");
  assert.equal(parsed.utm_term, "keyword");
  assert.equal(parsed.wallet_signature_present, true);
  assert.equal(parsed.sensitive_redacted, true);
  assert.ok(parsed.device_type);
  assert.ok(parsed.os_family);
  assert.ok(parsed.browser_family);
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "owner"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "wallet_address"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "wallet_signature"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "user_agent"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "referer"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "ip_address"));
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "accept_language"));

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

  if (originalSalt === undefined) {
    delete process.env.CHAINY_HASH_SALT;
  } else {
    process.env.CHAINY_HASH_SALT = originalSalt;
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

test("putDomainEvent normalises string tag inputs", async () => {
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
      eventType: "link_click",
      code: "extra",
      detail: {
        target: "https://example.com",
        tags: "defi, nft,dao,airdrop, staking, gamefi, infra,dao-tools,analytics, otc,trading,bridge",
        feature_flags: "beta-users whales pro enterprise",
      },
    },
    fakeClient,
  );

  const body = commands[0].input.Body?.toString() ?? "";
  const parsed = JSON.parse(body);
  const tags = parsed.tags as string[];
  const featureFlags = parsed.feature_flags as string[];

  assert.ok(Array.isArray(tags));
  assert.equal(tags.length, 10, "tags array should be trimmed to 10 entries");
  assert.deepEqual(tags.slice(0, 3), ["defi", "nft", "dao"]);
  assert.equal(tags[tags.length - 1], "otc");
  assert.ok(Array.isArray(featureFlags));
  assert.deepEqual(featureFlags, ["beta-users", "whales", "pro", "enterprise"]);
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, "sensitive_redacted"));

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
