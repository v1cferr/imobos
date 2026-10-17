"use client";

import { useActionState } from "react";

import { createClientAction, type FormState } from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PIPELINES, SOURCES } from "@/lib/crm/labels";

import { FormProblem } from "./form-problem";

/** Few fields, big targets: made to be filled on the phone, right after a call or a visit. */
export function QuickAddForm({
  defaultPipeline,
  defaults = {},
}: {
  defaultPipeline?: string;
  defaults?: { name?: string; phone?: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createClientAction, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormProblem state={state} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nome</FieldLabel>
          <Input id="name" name="name" required autoComplete="off" defaultValue={v.name ?? defaults.name} />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">WhatsApp</FieldLabel>
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            placeholder="(11) 98765-4321 ou link wa.me"
            defaultValue={v.phone ?? defaults.phone}
          />
          <FieldDescription>Pode colar o número do jeito que veio, ou o link do WhatsApp.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="pipeline">Funil</FieldLabel>
          <NativeSelect id="pipeline" name="pipeline" className="w-full" defaultValue={v.pipeline ?? defaultPipeline ?? "sales"}>
            {Object.entries(PIPELINES).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
            <NativeSelectOption value="">Ainda não sei</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="property">Empreendimento ou imóvel</FieldLabel>
          <Input id="property" name="property" defaultValue={v.property} />
        </Field>
        <Field>
          <FieldLabel htmlFor="source">Origem</FieldLabel>
          <NativeSelect id="source" name="source" className="w-full" defaultValue={v.source ?? "roleta"}>
            {Object.entries(SOURCES).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="need">O que procura</FieldLabel>
          <Textarea id="need" name="need" rows={3} placeholder="2 quartos na Lapa, até 600 mil, tem pet" defaultValue={v.need} />
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Cadastrar"}
      </Button>
    </form>
  );
}
