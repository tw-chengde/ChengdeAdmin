import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const getDb = vi.fn();
const getAllPlatformDefinitions = vi.fn();

vi.mock("@/app/lib/db", () => ({
  getDb: () => getDb(),
}));
vi.mock("@/app/lib/platforms/definitions", () => ({
  getAllPlatformDefinitions: () => getAllPlatformDefinitions(),
}));

const { listEnabledPlatformCodes, listPlatformStatuses, setPlatformEnabled } = await import("@/app/dashboard/platforms-actions");

beforeEach(() => {
  vi.clearAllMocks();
  getAllPlatformDefinitions.mockReturnValue([
    { code: "MOMO_MAIN", name: "MOMO", logo: "/momo.png" },
    { code: "MO_STORE_PLUS", name: "Mo Store", logo: "/mo-store.png" },
  ]);
  getDb.mockReturnValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([{ code: "MO_STORE_PLUS", enabled: false }]),
    }),
  });
});

test("listPlatformStatuses merges stored state with every supported platform definition", async () => {
  assert.deepEqual(await listPlatformStatuses(), [
    { code: "MOMO_MAIN", name: "MOMO", logo: "/momo.png", enabled: true },
    { code: "MO_STORE_PLUS", name: "Mo Store", logo: "/mo-store.png", enabled: false },
  ]);
});

test("listEnabledPlatformCodes returns only enabled platform codes", async () => {
  assert.deepEqual(await listEnabledPlatformCodes(), ["MOMO_MAIN"]);
});

test("setPlatformEnabled upserts platform state and handles a failed write", async () => {
  const values = vi.fn().mockReturnValue({
    onConflictDoUpdate: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) }),
  });
  getDb.mockReturnValue({ insert: vi.fn().mockReturnValue({ values }) });

  assert.deepEqual(await setPlatformEnabled("MO_STORE_PLUS", true), { ok: true });
  assert.deepEqual(values.mock.calls[0][0], { code: "MO_STORE_PLUS", enabled: true });

  getDb.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockReturnValue({ run: vi.fn().mockRejectedValue(new Error("write failed")) }) }),
    }),
  });
  assert.equal((await setPlatformEnabled("MO_STORE_PLUS", false)).ok, false);
});
