import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <DashboardClient
      user={{
        name: session.user.name ?? "管理者",
        email: session.user.email ?? "",
        image: session.user.image ?? undefined,
      }}
    />
  );
}
