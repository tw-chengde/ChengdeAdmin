import assert from "node:assert/strict";
import { test } from "vitest";
import { postJson } from "@/app/lib/platforms/platform-http";
import { resolvePlatformRequest } from "@/app/lib/platforms/platform-proxy";

test("postJson sends JSON and returns a parsed successful response", async () => {
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, "https://api.example.test/orders");
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, JSON.stringify({ page: 1 }));
    return new Response(JSON.stringify({ items: ["order-1"] }), { status: 200 });
  };

  const result = await postJson<{ items: string[] }>({
    url: "https://api.example.test/orders",
    headers: new Headers({ authorization: "Bearer token" }),
    body: { page: 1 },
    label: "Example API",
    fetchImpl,
  });

  assert.deepEqual(result, { items: ["order-1"] });
});

test("postJson keeps actionable HTTP and invalid-JSON errors", async () => {
  await assert.rejects(
    () => postJson({
      url: "https://api.example.test/orders",
      headers: new Headers(),
      body: {},
      label: "Example API",
      fetchImpl: async () => new Response("upstream unavailable", { status: 503 }),
    }),
    /Example API HTTP 503.*upstream unavailable/,
  );

  await assert.rejects(
    () => postJson({
      url: "https://api.example.test/orders",
      headers: new Headers(),
      body: {},
      label: "Example API",
      fetchImpl: async () => new Response("not JSON", { status: 200 }),
    }),
    /Example API/,
  );
});

test("resolvePlatformRequest uses the target directly without a proxy", () => {
  assert.deepEqual(
    resolvePlatformRequest("https://api.example.test/base/", "orders", {}),
    { url: "https://api.example.test/base/orders", proxyHeaders: {} },
  );
});

test("resolvePlatformRequest trims proxy URLs and requires its token", () => {
  assert.throws(
    () => resolvePlatformRequest("https://api.example.test", "/orders", { proxyUrl: "https://proxy.example.test/" }),
    /MOMO_PROXY_TOKEN/,
  );

  assert.deepEqual(
    resolvePlatformRequest("https://api.example.test", "/orders", {
      proxyUrl: " https://proxy.example.test/ ",
      proxyToken: "proxy-secret",
    }),
    {
      url: "https://proxy.example.test/orders",
      proxyHeaders: {
        "x-proxy-token": "proxy-secret",
        "x-target-url": "https://api.example.test",
      },
    },
  );
});