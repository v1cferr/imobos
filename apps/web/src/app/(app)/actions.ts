"use server";

import { signOut } from "@/auth";

export async function logout(): Promise<void> {
  // Clears the session cookie; signing out without a session is harmless, so no guard here.
  await signOut({ redirectTo: "/login" });
}
