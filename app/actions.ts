"use server";

import { getAuth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signOutFromDashboard() {
  // The `nextCookies()` plugin in auth.ts is what forwards the resulting
  // `Set-Cookie` to the browser — without it the session cookie survives.
  await getAuth().api.signOut({
    headers: await headers(),
  });
  redirect("/");
}
