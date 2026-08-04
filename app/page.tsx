import { getSession } from "@/auth";
import { redirect } from "next/navigation";
import LoginScreen from "./login-screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginScreen />;
}
