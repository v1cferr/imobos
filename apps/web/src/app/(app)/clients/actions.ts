"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addActivity,
  createClient,
  type CrmProblem,
  deleteClient,
  openDeal,
  recordMessage,
  updateClient,
  updateDeal,
} from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";
import {
  clientFields,
  localDateTime,
  money,
  pastedPhone,
  pipelineOf,
  sourceOf,
  stageOf,
  text,
} from "@/lib/crm/form";
import { MANUAL_KINDS } from "@/lib/crm/labels";
import { whatsappUrl } from "@/lib/crm/messages";
import { withFlash } from "@/lib/flash";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== "string" || !UUID.test(value)) throw new Error(`invalid ${name}`);
  return value;
}

/** What a form shows back: a message, and for a duplicate phone the client that already has it. */
export type FormState = { error?: string; duplicateId?: string; values?: Record<string, string> };

function problem(p: CrmProblem, form: FormData): FormState {
  // Keep what was typed: a refused form must not lose her quick note.
  const values = Object.fromEntries(
    [...form.entries()].filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  switch (p.problem) {
    case "invalid_phone":
      return { error: "Esse telefone não parece válido. Confira o DDD e o número.", values };
    case "duplicate_phone":
      return { error: "Já existe um cliente com esse telefone.", duplicateId: p.clientId, values };
    case "open_deal_exists":
      return { error: "Já existe um negócio aberto nesse funil.", values };
    case "not_found":
      return { error: "Cliente não encontrado.", values };
  }
}

export async function createClientAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = text(form, "name");
  if (!name) return { error: "Informe o nome do cliente." };
  const result = await createClient({
    actor: user.email,
    name,
    phone: pastedPhone(text(form, "phone")),
    source: sourceOf(form) ?? "manual",
    need: text(form, "need"),
    pipeline: pipelineOf(form),
    property: text(form, "property"),
  });
  if (!result.ok) return problem(result, form);
  revalidatePath("/clients");
  redirect(withFlash(`/clients/${result.value.id}`, "client_created"));
}

export async function updateClientAction(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!UUID.test(clientId)) throw new Error("invalid client id");
  const { name, source, ...rest } = clientFields(form);
  if (!name) return { error: "O nome não pode ficar vazio." };
  const result = await updateClient(clientId, {
    actor: user.email,
    name,
    ...(source ? { source } : {}),
    ...rest,
    phone: pastedPhone(rest.phone),
  });
  if (!result.ok) return problem(result, form);
  revalidatePath(`/clients/${clientId}`);
  redirect(withFlash(`/clients/${clientId}`, "client_updated"));
}

export async function deleteClientAction(form: FormData): Promise<void> {
  await requireUser();
  await deleteClient(uuid(form, "client_id"));
  revalidatePath("/clients");
  redirect(withFlash("/clients", "client_deleted"));
}

export async function openDealAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const clientId = uuid(form, "client_id");
  const pipeline = pipelineOf(form);
  if (!pipeline) throw new Error("invalid pipeline");
  const result = await openDeal(clientId, { actor: user.email, pipeline, property: text(form, "property") });
  revalidatePath(`/clients/${clientId}`);
  redirect(withFlash(`/clients/${clientId}`, result.ok ? "deal_opened" : result.problem));
}

/** The deal card's form sends every field, so a cleared next action really clears. */
export async function updateDealAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const clientId = uuid(form, "client_id");
  const stage = stageOf(form);
  const result = await updateDeal(uuid(form, "deal_id"), {
    actor: user.email,
    ...(stage ? { stage } : {}),
    property: text(form, "property"),
    value: money(form, "value"),
    next_action: text(form, "next_action"),
    next_action_due: localDateTime(form, "next_action_due"),
    lost_reason: text(form, "lost_reason"),
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/funnels");
  redirect(withFlash(`/clients/${clientId}`, result.ok ? "deal_updated" : result.problem));
}

export async function addActivityAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const clientId = uuid(form, "client_id");
  const kind = text(form, "kind");
  const body = text(form, "body");
  if (!kind || !(kind in MANUAL_KINDS) || !body) throw new Error("invalid activity");
  const result = await addActivity(clientId, {
    actor: user.email,
    kind: kind as keyof typeof MANUAL_KINDS,
    body,
  });
  revalidatePath(`/clients/${clientId}`);
  redirect(withFlash(`/clients/${clientId}`, result.ok ? "activity_added" : result.problem));
}

/** Records the message in the history, then hands her over to WhatsApp with the text ready. */
export async function sendMessageAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const clientId = uuid(form, "client_id");
  const phone = text(form, "phone");
  const body = text(form, "body");
  if (!phone || !body) throw new Error("invalid message");
  const dealId = form.get("deal_id");
  const result = await recordMessage(clientId, {
    actor: user.email,
    body,
    template: text(form, "template"),
    deal_id: typeof dealId === "string" && UUID.test(dealId) ? dealId : null,
  });
  if (!result.ok) redirect(withFlash(`/clients/${clientId}`, result.problem));
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/today");
  redirect(whatsappUrl(phone, body));
}
