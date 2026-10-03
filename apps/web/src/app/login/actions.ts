"use server";

import { signIn } from "@/auth";

export async function signInWithGoogle(): Promise<void> {
  // A fixed same-origin target: nothing from the request decides where the user lands.
  await signIn("google", { redirectTo: "/today" });
}
