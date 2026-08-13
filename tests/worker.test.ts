import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";

const handleImageOptimization = vi.fn();
const handlerFetch = vi.fn();

vi.mock("vinext/server/image-optimization", () => ({
  handleImageOptimization: (...args: unknown[]) => handleImageOptimization(...args),
  DEFAULT_DEVICE_SIZES: [320],
  DEFAULT_IMAGE_SIZES: [640],
}));
vi.mock("vinext/server/app-router-entry", () => ({
  default: { fetch: (...args: unknown[]) => handlerFetch(...args) },
}));

const { default: worker } = await import("@/worker/index");
const originalEnvironment = (globalThis as { __CLOUDFLARE_ENV__?: unknown }).__CLOUDFLARE_ENV__;
const originalWorkerValue = process.env.WORKER_TEST_VALUE;

function context() {
  return { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
}

function environment() {
  return {
    WORKER_TEST_VALUE: "available-at-request-time",
    DB: { prepare: vi.fn() },
    ASSETS: { fetch: vi.fn().mockResolvedValue(new Response("asset")) },
    IMAGES: {
      input: vi.fn().mockReturnValue({
        transform: vi.fn().mockReturnValue({
          output: vi.fn().mockResolvedValue({ response: () => new Response("image") }),
        }),
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalEnvironment === undefined) delete (globalThis as { __CLOUDFLARE_ENV__?: unknown }).__CLOUDFLARE_ENV__;
  else (globalThis as { __CLOUDFLARE_ENV__?: unknown }).__CLOUDFLARE_ENV__ = originalEnvironment;
  if (originalWorkerValue === undefined) delete process.env.WORKER_TEST_VALUE;
  else process.env.WORKER_TEST_VALUE = originalWorkerValue;
});

test("Worker passes ordinary requests to the app handler with D1 request context", async () => {
  const env = environment();
  const response = new Response("application");
  const ctx = context();
  handlerFetch.mockResolvedValue(response);
  const request = new Request("https://admin.example.test/dashboard/orders");

  assert.equal(await worker.fetch(request, env as never, ctx as never), response);
  assert.equal(process.env.WORKER_TEST_VALUE, "available-at-request-time");
  assert.equal((globalThis as { __CLOUDFLARE_ENV__?: unknown }).__CLOUDFLARE_ENV__, env);
  assert.equal(handlerFetch.mock.calls[0][0], request);
  assert.equal(handlerFetch.mock.calls[0][1], env);
  assert.equal(handlerFetch.mock.calls[0][2], ctx);
});

test("Worker routes image optimization requests through the configured image services", async () => {
  const env = environment();
  const response = new Response("optimized");
  handleImageOptimization.mockResolvedValue(response);
  const request = new Request("https://admin.example.test/_vinext/image?url=/logo.png");

  assert.equal(await worker.fetch(request, env as never, context() as never), response);
  assert.equal(handlerFetch.mock.calls.length, 0);
  const [, options, widths] = handleImageOptimization.mock.calls[0];
  assert.deepEqual(widths, [320, 640]);
  const transformed = await options.transformImage(new ReadableStream(), { width: 320, format: "webp", quality: 80 });
  assert.equal(await transformed.text(), "image");
});