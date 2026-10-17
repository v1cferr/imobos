"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { sendMessageAction } from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export type FilledTemplate = { title: string; text: string };

/** Pick a ready-made message, adjust it if needed, and open it in her WhatsApp. */
export function MessageComposer({
  clientId,
  phone,
  dealId,
  templates,
}: {
  clientId: string;
  phone: string;
  dealId: string | null;
  templates: FilledTemplate[];
}) {
  const [index, setIndex] = useState(0);
  const [body, setBody] = useState(templates[0]?.text ?? "");
  const pick = (i: number) => {
    setIndex(i);
    setBody(templates[i]?.text ?? "");
  };
  return (
    <form action={sendMessageAction} className="flex flex-col gap-3">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="phone" value={phone} />
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}
      <input type="hidden" name="template" value={templates[index]?.title ?? ""} />
      {templates.length > 0 && (
        <Field>
          <FieldLabel htmlFor="template-pick">Mensagem</FieldLabel>
          <NativeSelect
            id="template-pick"
            className="w-full"
            value={String(index)}
            onChange={(e) => pick(Number(e.target.value))}
          >
            {templates.map((t, i) => (
              <NativeSelectOption key={t.title + i} value={String(i)}>
                {t.title}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="message-body">Texto</FieldLabel>
        <Textarea id="message-body" name="body" rows={4} required value={body} onChange={(e) => setBody(e.target.value)} />
        <FieldDescription>Abre no seu WhatsApp; você ainda pode mexer antes de enviar.</FieldDescription>
      </Field>
      <Button type="submit" className="self-start">
        <Send aria-hidden />
        Abrir no WhatsApp
      </Button>
    </form>
  );
}
