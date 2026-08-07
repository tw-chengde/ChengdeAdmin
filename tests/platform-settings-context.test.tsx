import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PlatformStatus } from "@/app/types/platform";
import { PlatformSettingsProvider, usePlatformSettings } from "@/app/dashboard/platform-settings-context";

const listPlatformStatuses = vi.fn();
const setPlatformEnabled = vi.fn();

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listPlatformStatuses: () => listPlatformStatuses(),
  setPlatformEnabled: (code: unknown, enabled: unknown) => setPlatformEnabled(code, enabled),
}));

const momo: PlatformStatus = { code: "MOMO_MAIN", name: "MOMO 購物網", logo: "/images/momo.png", enabled: true };
const moStorePlus: PlatformStatus = { code: "MO_STORE_PLUS", name: "Mo 店+", logo: "/images/mo-store.jpg", enabled: true };

beforeEach(() => {
  vi.clearAllMocks();
  listPlatformStatuses.mockResolvedValue([momo, moStorePlus]);
  setPlatformEnabled.mockResolvedValue({ ok: true });
});

// 模擬「同時掛載的多個頁面」都讀取同一個 context。
function ConsumerA() {
  const { enabledPlatforms } = usePlatformSettings();
  return <div data-testid="consumer-a">{enabledPlatforms.map((p) => p.code).join(",")}</div>;
}
// 讀取 context 的錯誤／載入狀態，讓錯誤路徑不必靠某個頁面的畫面來驗證。
function StateConsumer() {
  const { error, loading, enabledPlatforms, refresh } = usePlatformSettings();
  return (
    <div>
      <div data-testid="error">{error ?? ""}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="codes">{enabledPlatforms.map((p) => p.code).join(",")}</div>
      <button onClick={() => refresh()}>重試</button>
    </div>
  );
}
function ConsumerB() {
  const { enabledPlatforms, toggle } = usePlatformSettings();
  return (
    <div>
      <div data-testid="consumer-b">{enabledPlatforms.map((p) => p.code).join(",")}</div>
      <button onClick={() => toggle("MO_STORE_PLUS", false)}>停用 Mo 店+</button>
    </div>
  );
}

test("多個消費者共用同一次載入，只打一次 listPlatformStatuses", async () => {
  render(
    <PlatformSettingsProvider>
      <ConsumerA />
      <ConsumerB />
    </PlatformSettingsProvider>
  );

  await waitFor(() => assert.equal(screen.getByTestId("consumer-a").textContent, "MOMO_MAIN,MO_STORE_PLUS"));
  assert.equal(screen.getByTestId("consumer-b").textContent, "MOMO_MAIN,MO_STORE_PLUS");
  assert.equal(listPlatformStatuses.mock.calls.length, 1);
});

test("其中一個消費者 toggle 後，另一個消費者立即看到更新，且不需重新打 D1", async () => {
  const user = userEvent.setup();
  render(
    <PlatformSettingsProvider>
      <ConsumerA />
      <ConsumerB />
    </PlatformSettingsProvider>
  );
  await waitFor(() => assert.equal(screen.getByTestId("consumer-a").textContent, "MOMO_MAIN,MO_STORE_PLUS"));

  await user.click(screen.getByRole("button", { name: "停用 Mo 店+" }));

  await waitFor(() => assert.equal(screen.getByTestId("consumer-a").textContent, "MOMO_MAIN"));
  assert.equal(screen.getByTestId("consumer-b").textContent, "MOMO_MAIN");
  assert.equal(listPlatformStatuses.mock.calls.length, 1, "toggle 成功應樂觀更新，不需重新載入");
});

test("載入失敗時把錯誤訊息交給消費者，且不會卡在載入中", async () => {
  listPlatformStatuses.mockRejectedValue(new Error("找不到 D1 binding 'DB'"));
  render(
    <PlatformSettingsProvider>
      <StateConsumer />
    </PlatformSettingsProvider>
  );

  await waitFor(() => assert.equal(screen.getByTestId("error").textContent, "找不到 D1 binding 'DB'"));
  // loading 沒收掉的話，各頁面會永遠停在 spinner，錯誤訊息也就沒機會顯示。
  assert.equal(screen.getByTestId("loading").textContent, "false");
  assert.equal(screen.getByTestId("codes").textContent, "");
});

test("refresh 成功後會清掉先前的錯誤訊息", async () => {
  const user = userEvent.setup();
  listPlatformStatuses.mockRejectedValueOnce(new Error("找不到 D1 binding 'DB'"));
  render(
    <PlatformSettingsProvider>
      <StateConsumer />
    </PlatformSettingsProvider>
  );
  await waitFor(() => assert.equal(screen.getByTestId("error").textContent, "找不到 D1 binding 'DB'"));

  await user.click(screen.getByRole("button", { name: "重試" }));

  await waitFor(() => assert.equal(screen.getByTestId("codes").textContent, "MOMO_MAIN,MO_STORE_PLUS"));
  assert.equal(screen.getByTestId("error").textContent, "", "重試成功後不該繼續顯示舊的錯誤");
});
