import { afterAll, beforeAll, describe, expect, test } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { createMomoProxyApp } from "../functions/momo-proxy/src/index";

describe("MOMO Cloud Run function proxy", () => {
  let proxyServer: http.Server;
  let targetServer: http.Server;
  let proxyPort: number;
  let targetPort: number;
  let receivedHeaders: http.IncomingHttpHeaders | undefined;
  let receivedBody: string | undefined;

  beforeAll(async () => {
    targetServer = http.createServer((req, res) => {
      receivedHeaders = req.headers;
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        receivedBody = Buffer.concat(chunks).toString("utf8");
        if (req.url === "/orders") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify([{ id: "MOMO_TEST_001", channelCode: "MOMO_MAIN" }]));
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
      });
    });

    await new Promise<void>((resolve) => {
      targetServer.listen(0, () => {
        targetPort = (targetServer.address() as AddressInfo).port;
        resolve();
      });
    });

    process.env.MOMO_PROXY_TOKEN = "test-secret-123";
    proxyServer = http.createServer(
      createMomoProxyApp({
        defaultTarget: `http://127.0.0.1:${targetPort}`,
        allowedTargetHosts: ["127.0.0.1"],
        allowInsecureTargets: true,
      }),
    );
    await new Promise<void>((resolve) => {
      proxyServer.listen(0, () => {
        proxyPort = (proxyServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
    await new Promise<void>((resolve) => targetServer.close(() => resolve()));
    delete process.env.MOMO_PROXY_TOKEN;
  });

  test("returns 403 when the proxy token is missing or incorrect", async () => {
    const missing = await fetch(`http://127.0.0.1:${proxyPort}/orders`);
    expect(missing.status).toBe(403);

    const incorrect = await fetch(`http://127.0.0.1:${proxyPort}/orders`, {
      headers: { "x-proxy-token": "incorrect" },
    });
    expect(incorrect.status).toBe(403);
  });

  test("proxies an authorised JSON body and Bearer token to an allowed dynamic target", async () => {
    const response = await fetch(`http://127.0.0.1:${proxyPort}/orders`, {
      method: "POST",
      headers: {
        "x-proxy-token": "test-secret-123",
        "x-target-url": `http://127.0.0.1:${targetPort}`,
        Authorization: "Bearer momo-access-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: "ORDER_001" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ id: "MOMO_TEST_001", channelCode: "MOMO_MAIN" }]);
    expect(receivedHeaders?.["x-proxy-token"]).toBeUndefined();
    expect(receivedHeaders?.["x-target-url"]).toBeUndefined();
    expect(receivedHeaders?.authorization).toBe("Bearer momo-access-token");
    expect(receivedBody).toBe(JSON.stringify({ orderId: "ORDER_001" }));
  });

  test("rejects a dynamic target outside the allowlist", async () => {
    const response = await fetch(`http://127.0.0.1:${proxyPort}/orders`, {
      headers: {
        "x-proxy-token": "test-secret-123",
        "x-target-url": "https://attacker.example",
      },
    });

    expect(response.status).toBe(400);
  });
});