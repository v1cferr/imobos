"use client";

import { useActionState } from "react";

import { type FormState, updateClientAction } from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/lib/api/crm";
import { formatPhone, PURPOSES, SOURCES } from "@/lib/crm/labels";

import { FormProblem } from "./form-problem";

const yesNo = (value: boolean | null) => (value === true ? "yes" : value === false ? "no" : "");

function TextField({ name, label, value, ...props }: { name: string; label: string; value: string } & React.ComponentProps<"input">) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} defaultValue={value} {...props} />
    </Field>
  );
}

function YesNo({ name, label, value }: { name: string; label: string; value: boolean | null }) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <NativeSelect id={name} name={name} className="w-full" defaultValue={yesNo(value)}>
        <NativeSelectOption value="">Não perguntei</NativeSelectOption>
        <NativeSelectOption value="yes">Sim</NativeSelectOption>
        <NativeSelectOption value="no">Não</NativeSelectOption>
      </NativeSelect>
    </Field>
  );
}

/** Every field, in the order she asks them (questionnaire of 03/10, question 6). */
export function ClientForm({ client }: { client: Client }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateClientAction.bind(null, client.id),
    {},
  );
  const n = (x: number | null) => (x === null ? "" : String(x));
  return (
    <form action={action} className="flex flex-col gap-6">
      <FormProblem state={state} />
      <FieldSet>
        <FieldLegend>Contato</FieldLegend>
        <FieldGroup>
          <TextField name="name" label="Nome" value={client.name} required />
          <TextField name="phone" label="WhatsApp" value={formatPhone(client.phone)} type="tel" inputMode="tel" />
          <TextField name="email" label="E-mail" value={client.email ?? ""} type="email" />
          <Field>
            <FieldLabel htmlFor="source">Origem</FieldLabel>
            <NativeSelect id="source" name="source" className="w-full" defaultValue={client.source}>
              {Object.entries(SOURCES).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>O que procura</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="purpose">Finalidade</FieldLabel>
            <NativeSelect id="purpose" name="purpose" className="w-full" defaultValue={client.purpose ?? ""}>
              <NativeSelectOption value="">Não perguntei</NativeSelectOption>
              {Object.entries(PURPOSES).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <TextField name="budget_max" label="Orçamento até (R$)" value={client.budget_max ? String(Math.round(Number(client.budget_max))) : ""} inputMode="numeric" />
          <TextField name="region" label="Região" value={client.region ?? ""} />
          <TextField name="property_type" label="Tipo de imóvel" value={client.property_type ?? ""} placeholder="Apartamento, casa, studio..." />
          <TextField name="min_area_m2" label="Metragem mínima (m²)" value={n(client.min_area_m2)} type="number" min={0} inputMode="numeric" />
          <TextField name="bedrooms" label="Quartos" value={n(client.bedrooms)} type="number" min={0} inputMode="numeric" />
          <TextField name="parking" label="Vagas" value={n(client.parking)} type="number" min={0} inputMode="numeric" />
          <YesNo name="financing" label="Vai financiar?" value={client.financing} />
          <YesNo name="pets" label="Tem pets?" value={client.pets} />
          <Field>
            <FieldLabel htmlFor="need">Necessidade</FieldLabel>
            <Textarea id="need" name="need" rows={3} defaultValue={client.need ?? ""} />
          </Field>
        </FieldGroup>
      </FieldSet>
      <Field>
        <FieldLabel htmlFor="notes">Observações</FieldLabel>
        <Textarea id="notes" name="notes" rows={4} defaultValue={client.notes ?? ""} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
