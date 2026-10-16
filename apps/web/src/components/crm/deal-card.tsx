import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { updateDealAction } from "@/app/(app)/clients/actions";
import type { Deal } from "@/lib/api/crm";
import { toLocalInput } from "@/lib/crm/form";
import { PIPELINES, STAGE_ORDER, stageLabel } from "@/lib/crm/labels";

/** One deal: its stage, the next action and when. A single form, so one tap saves it all. */
export function DealCard({ deal }: { deal: Deal }) {
  const closed = deal.stage === "won" || deal.stage === "lost";
  const f = (name: string) => `${name}-${deal.id}`;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{PIPELINES[deal.pipeline]}</CardTitle>
        <CardAction>
          <Badge variant={closed ? "secondary" : "default"}>{stageLabel(deal.stage, deal.pipeline)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form action={updateDealAction} className="flex flex-col gap-4">
          <input type="hidden" name="deal_id" value={deal.id} />
          <input type="hidden" name="client_id" value={deal.client_id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={f("stage")}>Etapa</FieldLabel>
              <NativeSelect id={f("stage")} name="stage" className="w-full" defaultValue={deal.stage}>
                {STAGE_ORDER.map((stage) => (
                  <NativeSelectOption key={stage} value={stage}>
                    {stageLabel(stage, deal.pipeline)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={f("next_action")}>Próxima ação</FieldLabel>
              <Input id={f("next_action")} name="next_action" defaultValue={deal.next_action ?? ""} placeholder="Ligar para confirmar a visita" />
            </Field>
            <Field>
              <FieldLabel htmlFor={f("next_action_due")}>Quando</FieldLabel>
              <Input id={f("next_action_due")} name="next_action_due" type="datetime-local" defaultValue={toLocalInput(deal.next_action_due)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={f("property")}>{deal.pipeline === "sales" ? "Empreendimento" : "Imóvel"}</FieldLabel>
              <Input id={f("property")} name="property" defaultValue={deal.property ?? ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor={f("value")}>{deal.pipeline === "sales" ? "Valor do imóvel (R$)" : "Aluguel (R$)"}</FieldLabel>
              <Input id={f("value")} name="value" inputMode="numeric" defaultValue={deal.value ? String(Math.round(Number(deal.value))) : ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor={f("lost_reason")}>Motivo, se perdido</FieldLabel>
              <Input id={f("lost_reason")} name="lost_reason" defaultValue={deal.lost_reason ?? ""} />
            </Field>
          </FieldGroup>
          <Button type="submit">Salvar negócio</Button>
        </form>
      </CardContent>
    </Card>
  );
}
