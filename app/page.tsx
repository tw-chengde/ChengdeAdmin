import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginScreen from "./login-screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginScreen />;
}
