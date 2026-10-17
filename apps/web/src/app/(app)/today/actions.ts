"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { completeAction, updateDeal } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";
import { tomorrowOf } from "@/lib/crm/form";
import { withFlash } from "@/lib/flash";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dealId(form: FormData): string {
  const value = form.get("deal_id");
  if (typeof value !== "string" || !UUID.test(value)) throw new Error("invalid deal_id");
  return value;
}

export async function doneAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const result = await completeAction(dealId(form), user.email);
  revalidatePath("/today");
  redirect(withFlash("/today", result.ok ? "action_done" : result.problem));
}

export async function postponeAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const due = form.get("due");
  const result = await updateDeal(dealId(form), {
    actor: user.email,
    next_action_due: tomorrowOf(typeof due === "string" && due ? due : null),
  });
  revalidatePath("/today");
  redirect(withFlash("/today", result.ok ? "action_postponed" : result.problem));
}
