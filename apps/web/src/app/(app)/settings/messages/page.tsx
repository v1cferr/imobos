import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listTemplates, type Template } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";
import { PLACEHOLDERS } from "@/lib/crm/messages";

import { deleteTemplateAction, saveTemplateAction } from "./actions";

function TemplateForm({ template }: { template?: Template }) {
  const key = template?.id ?? "new";
  return (
    <form action={saveTemplateAction} className="flex flex-col gap-3">
      {template && <input type="hidden" name="id" value={template.id} />}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`title-${key}`}>Nome</FieldLabel>
          <Input id={`title-${key}`} name="title" required maxLength={80} defaultValue={template?.title} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`body-${key}`}>Texto</FieldLabel>
          <Textarea id={`body-${key}`} name="body" rows={4} required maxLength={2000} defaultValue={template?.body} />
        </Field>
      </FieldGroup>
      <Button type="submit" variant={template ? "outline" : "default"} className="self-start">
        {template ? "Salvar" : "Adicionar mensagem"}
      </Button>
    </form>
  );
}

export default async function MessagesSettingsPage() {
  await requireUser();
  const templates = await listTemplates();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Mensagens prontas</h1>
        <p className="text-muted-foreground">
          Os textos que aparecem na ficha do cliente para abrir no seu WhatsApp. Use estas marcações e o
          ImobOS completa para cada cliente:
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {Object.entries(PLACEHOLDERS).map(([key, meaning]) => (
          <div key={key} className="contents">
            <dt className="font-mono">{key}</dt>
            <dd className="text-muted-foreground">{meaning}</dd>
          </div>
        ))}
      </dl>

      {templates.map((t) => (
        <Card key={t.id} size="sm">
          <CardContent className="flex flex-col gap-3">
            <TemplateForm template={t} />
            <form action={deleteTemplateAction}>
              <input type="hidden" name="id" value={t.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                <Trash2 aria-hidden />
                Apagar
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}

      <section aria-labelledby="new-template" className="flex flex-col gap-3">
        <h2 id="new-template" className="text-xl font-semibold">
          Nova mensagem
        </h2>
        <TemplateForm />
      </section>
    </div>
  );
}
