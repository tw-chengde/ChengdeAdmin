import { afterAll, beforeAll, describe, expect, test } from "vitest";
import express from "express";
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

  /**
   * Cloud Functions 的 functions-framework 會在使用者的 app 之前掛上 body parser，
   * 使 req.body 有值、讓 fixRequestBody 真的寫入請求主體並送出標頭。
   * 上面那組測試用裸 http server（沒有 parser）跑，因此無法重現雲端才會發生的
   * ERR_HTTP_HEADERS_SENT。這裡刻意複製 GCF 的組裝方式來守住這條路徑。
   */
  describe("以 Cloud Functions 的方式在前面掛上 body parser", () => {
    let parsedProxyServer: http.Server;
    let parsedProxyPort: number;

    beforeAll(async () => {
      const outer = express();
      outer.use(express.json());
      outer.use(
        createMomoProxyApp({
          defaultTarget: `http://127.0.0.1:${targetPort}`,
          allowedTargetHosts: ["127.0.0.1"],
          allowInsecureTargets: true,
        }),
      );
      parsedProxyServer = http.createServer(outer);
      await new Promise<void>((resolve) => {
        parsedProxyServer.listen(0, () => {
          parsedProxyPort = (parsedProxyServer.address() as AddressInfo).port;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => parsedProxyServer.close(() => resolve()));
    });

    test("body 已被解析時仍能轉發 POST，且不會因移除標頭而回 500", async () => {
      const response = await fetch(`http://127.0.0.1:${parsedProxyPort}/orders`, {
        method: "POST",
        headers: {
          "x-proxy-token": "test-secret-123",
          "x-target-url": `http://127.0.0.1:${targetPort}`,
          Authorization: "Bearer momo-access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ queryMethod: "All", pageIndex: 1 }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([{ id: "MOMO_TEST_001", channelCode: "MOMO_MAIN" }]);
      expect(receivedBody).toBe(JSON.stringify({ queryMethod: "All", pageIndex: 1 }));
      // 憑證標頭仍必須被攔下，不可轉發給平台。
      expect(receivedHeaders?.["x-proxy-token"]).toBeUndefined();
      expect(receivedHeaders?.["x-target-url"]).toBeUndefined();
      expect(receivedHeaders?.authorization).toBe("Bearer momo-access-token");
    });
  });
});