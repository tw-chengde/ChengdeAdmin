import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test, vi } from "vitest";
vi.mock("@/app/dashboard/dashboard-sidebar", () => ({
  default: ({ compactSidebar, mobileOpen, onToggleCollapsed }: { compactSidebar: boolean; mobileOpen: boolean; onToggleCollapsed: () => void }) => (
    <section>
      <output data-testid="sidebar-state">{`${compactSidebar}:${mobileOpen}`}</output>
      <button type="button" onClick={onToggleCollapsed}>toggle</button>
    </section>
  ),
}));

const { default: DashboardShell } = await import("@/app/dashboard/dashboard-shell");

test("DashboardShell opens the mobile sidebar from its header menu", async () => {
  const user = userEvent.setup();
  render(<DashboardShell user={{ name: "Ada", email: "ada@example.test" }}>content</DashboardShell>);

  assert.equal(screen.getByTestId("sidebar-state").textContent, "false:false");
  await user.click(screen.getByTestId("MenuRoundedIcon").closest("button")!);
  assert.equal(screen.getByTestId("sidebar-state").textContent, "false:true");
  assert.ok(screen.getByText("content"));
});
