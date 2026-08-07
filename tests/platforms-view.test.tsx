import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PlatformStatus } from "@/app/types/platform";
import { PlatformSettingsProvider } from "@/app/dashboard/platform-settings-context";

// server actions 會呼叫 D1，測試時整個模組換成 spy。
const listPlatformStatuses = vi.fn();
const setPlatformEnabled = vi.fn();

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listPlatformStatuses: () => listPlatformStatuses(),
  setPlatformEnabled: (code: unknown, enabled: unknown) => setPlatformEnabled(code, enabled),
}));

const { default: PlatformsView } = await import("@/app/dashboard/platforms-view");

const momo: PlatformStatus = { code: "MOMO_MAIN", name: "MOMO 購物網", logo: "/images/momo.png", enabled: true };
const moStorePlus: PlatformStatus = { code: "MO_STORE_PLUS", name: "Mo 店+", logo: "/images/mo-store.jpg", enabled: false };

beforeEach(() => {
  vi.clearAllMocks();
  listPlatformStatuses.mockResolvedValue([momo, moStorePlus]);
  setPlatformEnabled.mockResolvedValue({ ok: true });
});

async function renderPlatforms() {
  const user = userEvent.setup();
  render(
    <PlatformSettingsProvider>
      <PlatformsView />
    </PlatformSettingsProvider>
  );
  await screen.findByText(momo.name);
  return user;
}

test("載入後依平台狀態顯示對應的開關", async () => {
  await renderPlatforms();

  const switches = screen.getAllByRole("switch");
  assert.equal(switches.length, 2);
  assert.equal((switches[0] as HTMLInputElement).checked, true);
  assert.equal((switches[1] as HTMLInputElement).checked, false);
});

test("切換開關會呼叫 setPlatformEnabled 並樂觀更新狀態（不重新打 D1）", async () => {
  const user = await renderPlatforms();

  await user.click(screen.getByRole("switch", { name: `切換 ${momo.name}` }));

  await waitFor(() => assert.equal(setPlatformEnabled.mock.calls.length, 1));
  assert.deepEqual(setPlatformEnabled.mock.calls[0], ["MOMO_MAIN", false]);
  await waitFor(() => assert.equal((screen.getByRole("switch", { name: `切換 ${momo.name}` }) as HTMLInputElement).checked, false));
  assert.equal(listPlatformStatuses.mock.calls.length, 1, "成功後應樂觀更新，不需重新載入");
});

test("切換失敗時顯示錯誤且開關狀態不變", async () => {
  setPlatformEnabled.mockResolvedValue({ ok: false, error: "更新平台狀態失敗，請稍後再試" });
  const user = await renderPlatforms();

  await user.click(screen.getByRole("switch", { name: `切換 ${momo.name}` }));

  assert.ok(await screen.findByText("更新平台狀態失敗，請稍後再試"));
  const switches = screen.getAllByRole("switch");
  assert.equal((switches[0] as HTMLInputElement).checked, true);
});

test("載入平台設定失敗時顯示錯誤訊息", async () => {
  listPlatformStatuses.mockRejectedValue(new Error("找不到 D1 binding 'DB'"));
  render(
    <PlatformSettingsProvider>
      <PlatformsView />
    </PlatformSettingsProvider>
  );

  assert.ok(await screen.findByText("找不到 D1 binding 'DB'"));
});
