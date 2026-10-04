"use server";

import { revalidatePath } from "next/cache";

import { rejectUser, type Role, type Status, updateUser } from "@/lib/api/internal";
import { requireAdmin } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server Actions are public endpoints: each one re-checks the admin role and validates its input,
// whatever the page that rendered the button allowed.
function userId(form: FormData): string {
  const id = form.get("id");
  if (typeof id !== "string" || !UUID.test(id)) throw new Error("invalid user id");
  return id;
}

async function change(form: FormData, change: { status?: Status; role?: Role }): Promise<void> {
  const admin = await requireAdmin();
  await updateUser(userId(form), { actor: admin.email, ...change });
  revalidatePath("/admin/users");
}

export async function approve(form: FormData): Promise<void> {
  await change(form, { status: "approved" });
}

export async function disable(form: FormData): Promise<void> {
  await change(form, { status: "disabled" });
}

export async function enable(form: FormData): Promise<void> {
  await change(form, { status: "approved" });
}

export async function setRole(form: FormData): Promise<void> {
  const role = form.get("role");
  if (role !== "admin" && role !== "user") throw new Error("invalid role");
  await change(form, { role });
}

/** Refusing a request deletes it: nothing is kept about someone who was not let in. */
export async function reject(form: FormData): Promise<void> {
  await requireAdmin();
  await rejectUser(userId(form));
  revalidatePath("/admin/users");
}
