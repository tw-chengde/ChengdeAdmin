import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";

const betterAuth = vi.fn();
const nextCookies = vi.fn();
const getD1Database = vi.fn();
const getHeaders = vi.fn();
const environmentNames = ["BETTER_AUTH_URL", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] as const;
const originalEnvironment = new Map(environmentNames.map((name) => [name, process.env[name]]));

vi.mock("better-auth", () => ({ betterAuth: (config: unknown) => betterAuth(config) }));
vi.mock("better-auth/next-js", () => ({ nextCookies: () => nextCookies() }));
vi.mock("next/headers", () => ({ headers: () => getHeaders() }));
vi.mock("@/app/lib/db", () => ({ getD1Database: () => getD1Database() }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.BETTER_AUTH_URL = "https://admin.example.test";
  process.env.AUTH_GOOGLE_ID = "google-client-id";
  process.env.AUTH_GOOGLE_SECRET = "google-client-secret";
  getD1Database.mockReturnValue({ prepare: vi.fn() });
  nextCookies.mockReturnValue({ name: "next-cookies" });
  getHeaders.mockResolvedValue(new Headers({ cookie: "session=abc" }));
});

afterEach(() => {
  for (const name of environmentNames) {
    const value = originalEnvironment.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("getAuth configures Better Auth lazily and caches the instance", async () => {
  const auth = { api: { getSession: vi.fn(), signOut: vi.fn() } };
  betterAuth.mockReturnValue(auth);
  const { getAuth } = await import("@/auth");

  assert.equal(getAuth(), auth);
  assert.equal(getAuth(), auth);
  assert.equal(betterAuth.mock.calls.length, 1);
  assert.deepEqual(betterAuth.mock.calls[0][0], {
    baseURL: "https://admin.example.test",
    database: getD1Database.mock.results[0]?.value,
    socialProviders: {
      google: { clientId: "google-client-id", clientSecret: "google-client-secret" },
    },
    plugins: [{ name: "next-cookies" }],
  });
});

test("getSession forwards the request headers to Better Auth", async () => {
  const session = { user: { id: "user-1" } };
  const getSession = vi.fn().mockResolvedValue(session);
  betterAuth.mockReturnValue({ api: { getSession, signOut: vi.fn() } });
  const { getSession: readSession } = await import("@/auth");

  assert.equal(await readSession(), session);
  assert.deepEqual(getSession.mock.calls[0][0], { headers: await getHeaders.mock.results[0]?.value });
});

test("getAuth fails at first use when a required credential is missing", async () => {
  process.env.AUTH_GOOGLE_SECRET = "";
  const { getAuth } = await import("@/auth");

  assert.throws(() => getAuth(), /AUTH_GOOGLE_SECRET/);
  assert.equal(betterAuth.mock.calls.length, 0);
});