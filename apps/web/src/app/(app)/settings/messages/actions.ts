"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createTemplate, deleteTemplate, updateTemplate } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";
import { text } from "@/lib/crm/form";
import { withFlash } from "@/lib/flash";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = "/settings/messages";

/** Creates when the form has no id, edits otherwise. */
export async function saveTemplateAction(form: FormData): Promise<void> {
  await requireUser();
  const title = text(form, "title")?.slice(0, 80);
  const body = text(form, "body")?.slice(0, 2000);
  if (!title || !body) throw new Error("invalid template");
  const id = text(form, "id");
  if (id) {
    if (!UUID.test(id)) throw new Error("invalid id");
    await updateTemplate(id, { title, body });
  } else {
    await createTemplate({ title, body });
  }
  revalidatePath(PAGE);
  redirect(withFlash(PAGE, "template_saved"));
}

export async function deleteTemplateAction(form: FormData): Promise<void> {
  await requireUser();
  const id = text(form, "id");
  if (!id || !UUID.test(id)) throw new Error("invalid id");
  await deleteTemplate(id);
  revalidatePath(PAGE);
  redirect(withFlash(PAGE, "template_deleted"));
}
