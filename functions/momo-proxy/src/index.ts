import { http } from "@google-cloud/functions-framework";
import express from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

const defaultAllowedTargetHosts = ["scmapi.momoshop.com.tw", "api3p.momo.com.tw"];

export interface MomoProxyOptions {
  defaultTarget?: string;
  allowedTargetHosts?: string[];
  allowInsecureTargets?: boolean;
}

function configuredAllowedTargetHosts(): string[] {
  const configuredHosts = process.env.PROXY_ALLOWED_TARGET_HOSTS
    ?.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return configuredHosts?.length ? configuredHosts : defaultAllowedTargetHosts;
}

function isAllowedHost(host: string, allowedHosts: string[]): boolean {
  return allowedHosts.some((allowedHost) => {
    if (allowedHost.startsWith("*.")) {
      const parentDomain = allowedHost.slice(1);
      return host.endsWith(parentDomain) && host !== parentDomain.slice(1);
    }

    return host === allowedHost;
  });
}

function validateTarget(rawTarget: string, allowedTargetHosts: string[], allowInsecureTargets: boolean): string {
  const target = new URL(rawTarget);
  const supportsProtocol = target.protocol === "https:" || (allowInsecureTargets && target.protocol === "http:");

  if (!supportsProtocol || target.username || target.password || !isAllowedHost(target.hostname, allowedTargetHosts)) {
    throw new Error("The proxy target is not allowed.");
  }

  return target.origin;
}

function targetFromHeader(header: string | string[] | undefined, fallback?: string): string {
  if (Array.isArray(header)) {
    throw new Error("Only one x-target-url header is allowed.");
  }

  const target = header || fallback;
  if (!target) {
    throw new Error("Target URL is required.");
  }

  return target;
}

export function createMomoProxyApp({
  defaultTarget: configuredDefaultTarget,
  allowedTargetHosts = configuredAllowedTargetHosts(),
  allowInsecureTargets = false,
}: MomoProxyOptions = {}) {
  const normalizedAllowedTargetHosts = allowedTargetHosts.map((host) => host.trim().toLowerCase()).filter(Boolean);
  const app = express();

  app.use((req, res, next) => {
    const token = process.env.MOMO_PROXY_TOKEN;
    const incomingToken = req.headers["x-proxy-token"];

    if (!token || incomingToken !== token) {
      res.status(403).send("Forbidden");
      return;
    }

    next();
  });

  app.use((req, res, next) => {
    let target: string;

    try {
      const rawTarget = targetFromHeader(req.headers["x-target-url"], configuredDefaultTarget);
      target = validateTarget(rawTarget, normalizedAllowedTargetHosts, allowInsecureTargets);
    } catch {
      res.status(400).send("Invalid proxy target.");
      return;
    }

    const proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req) => {
          fixRequestBody(proxyReq, req);
          proxyReq.removeHeader("x-proxy-token");
          proxyReq.removeHeader("x-target-url");
          proxyReq.removeHeader("x-forwarded-for");
          proxyReq.removeHeader("x-real-ip");
        },
        error: (error, _req, res) => {
          console.error("MOMO proxy request failed:", error);
          if ("status" in res && typeof res.status === "function") {
            res.status(502).send("Proxy Error");
          }
        },
      },
    });

    proxy(req, res, next);
  });

  return app;
}

export const app = createMomoProxyApp();

http("momoProxy", app);
