import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test, vi } from "vitest";
import { navItems } from "@/app/dashboard/nav-items";

const usePathname = vi.fn();
const signOutFromDashboard = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: React.ComponentProps<"a">) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));
vi.mock("@/app/actions", () => ({
  signOutFromDashboard: () => signOutFromDashboard(),
}));

const { default: DashboardSidebar } = await import("@/app/dashboard/dashboard-sidebar");

test("DashboardSidebar marks the current navigation item and closes the mobile drawer after navigation", async () => {
  usePathname.mockReturnValue("/dashboard/orders");
  const onCloseMobile = vi.fn();
  const user = userEvent.setup();
  render(
    <DashboardSidebar
      user={{ name: "Ada", email: "ada@example.test" }}
      desktop={true}
      compactSidebar={false}
      mobileOpen={false}
      onCloseMobile={onCloseMobile}
      onToggleCollapsed={vi.fn()}
    />,
  );

  const active = screen.getByRole("link", { name: navItems[3].label });
  assert.equal(active.getAttribute("aria-current"), "page");
  assert.equal(screen.getByText("Ada").textContent, "Ada");
  assert.equal(screen.getByText("ada@example.test").textContent, "ada@example.test");

  await user.click(screen.getByRole("link", { name: navItems[0].label }));
  assert.equal(onCloseMobile.mock.calls.length, 1);
});

test("DashboardSidebar exposes the compact toggle and user fallback avatar", async () => {
  usePathname.mockReturnValue("/dashboard/overview");
  const onToggleCollapsed = vi.fn();
  const user = userEvent.setup();
  render(
    <DashboardSidebar
      user={{ name: "Ada", email: "ada@example.test" }}
      desktop={true}
      compactSidebar={true}
      mobileOpen={false}
      onCloseMobile={vi.fn()}
      onToggleCollapsed={onToggleCollapsed}
    />,
  );

  assert.ok(screen.getByText("A"));
  await user.click(screen.getByRole("button", { name: /./ }));
  assert.equal(onToggleCollapsed.mock.calls.length, 1);
});
