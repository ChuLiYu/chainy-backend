import test from "node:test";
import assert from "node:assert/strict";

const API_ENDPOINT = process.env.CHAINY_API_ENDPOINT ?? process.env.API_ENDPOINT;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_TEST_REFRESH_TOKEN = process.env.GOOGLE_TEST_REFRESH_TOKEN;
const GOOGLE_TEST_REDIRECT_URI = process.env.GOOGLE_TEST_REDIRECT_URI ?? "http://localhost:3000/google-auth-callback.html";

const missingEnv = [
  ["CHAINY_API_ENDPOINT", API_ENDPOINT],
  ["GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID],
  ["GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET],
  ["GOOGLE_TEST_REFRESH_TOKEN", GOOGLE_TEST_REFRESH_TOKEN],
].filter(([, value]) => !value);

if (missingEnv.length > 0) {
  const missingKeys = missingEnv.map(([key]) => key).join(", ");
  test("Google OAuth E2E skipped - missing configuration", { skip: `缺少必要環境變數: ${missingKeys}` }, () => {});
} else {
  test("Google OAuth 端到端流程", async (t) => {
    const idToken = await fetchGoogleIdToken({
      clientId: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      refreshToken: GOOGLE_TEST_REFRESH_TOKEN!,
      redirectUri: GOOGLE_TEST_REDIRECT_URI,
    });

    const authResponse = await fetchJson(`${API_ENDPOINT}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleToken: idToken,
        provider: "google",
        tokenType: "id_token",
      }),
    });

    assert.equal(authResponse.status, 200, "Google 認證 API 應回傳 200 狀態碼");

    const authPayload = await authResponse.json();

    assert.ok(authPayload.jwt, "應取得 JWT token");
    assert.ok(authPayload.user?.email, "應取得使用者 email");

    const customCode = `e2e-${Date.now().toString(36)}`;
    const targetUrl = `https://example.com/test/${customCode}`;

    const createResponse = await fetchJson(`${API_ENDPOINT}/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authPayload.jwt}`,
      },
      body: JSON.stringify({ target: targetUrl, code: customCode }),
    });

    assert.equal(createResponse.status, 200, "建立自訂短網址應成功");

    const createPayload = await createResponse.json();
    assert.equal(createPayload.code, customCode, "回傳的短網址代碼應與請求相同");
    assert.ok(createPayload.short_url, "應回傳短網址");

    const listResponse = await fetchJson(`${API_ENDPOINT}/links`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authPayload.jwt}`,
      },
    });

    assert.equal(listResponse.status, 200, "取得短網址列表應成功");

    const listPayload = await listResponse.json();
    const foundLink = Array.isArray(listPayload.links)
      ? listPayload.links.find((link: any) => link.code === customCode)
      : undefined;

    assert.ok(foundLink, "列表中應包含剛建立的短網址");
    assert.equal(foundLink.target, targetUrl, "短網址目標應與建立時相同");

    await t.test("清理建立的短網址", async () => {
      const deleteResponse = await fetch(`${API_ENDPOINT}/links/${customCode}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authPayload.jwt}`,
        },
      });

      // 允許刪除失敗（例如 API 尚未支援 DELETE），但若成功應為 204
      if (deleteResponse.ok) {
        assert.equal(deleteResponse.status, 204);
      }
    });
  });
}

type GoogleTokenRequest = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
};

async function fetchGoogleIdToken({
  clientId,
  clientSecret,
  refreshToken,
  redirectUri,
}: GoogleTokenRequest): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`取得 Google ID Token 失敗: ${response.status} ${errorPayload}`);
  }

  const tokens = (await response.json()) as { id_token?: string };

  if (!tokens.id_token) {
    throw new Error("Google 回應中沒有 id_token，請檢查 refresh token 是否有效");
  }

  return tokens.id_token;
}

type FetchOptions = Parameters<typeof fetch>[1];

async function fetchJson(input: string, init?: FetchOptions): Promise<Response> {
  const response = await fetch(input, init);
  return response;
}
