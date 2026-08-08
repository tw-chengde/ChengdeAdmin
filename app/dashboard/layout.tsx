import { getSession } from "@/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import DashboardShell from "./dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? "使用者",
        email: session.user.email ?? "",
        image: session.user.image ?? undefined,
      }}
    >
      {children}
    </DashboardShell>
  );
}