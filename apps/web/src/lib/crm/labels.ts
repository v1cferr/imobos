/** How the CRM's values read on screen, in the broker's words (pt-BR). */
import type { ActivityKind, LeadSource, Pipeline, Purpose, Stage } from "@/lib/api/crm";

export const PIPELINES: Record<Pipeline, string> = { sales: "Vendas", rental: "Locação" };

export const SOURCES: Record<LeadSource, string> = {
  roleta: "Roleta da construtora",
  whatsapp: "WhatsApp",
  meta_lead_ads: "Anúncio (Meta)",
  indicacao: "Indicação",
  planilha: "Planilha",
  manual: "Cadastro manual",
  outro: "Outro",
};

export const PURPOSES: Record<Purpose, string> = { buy: "Comprar", rent: "Alugar" };

export const STAGE_ORDER: readonly Stage[] = [
  "new",
  "qualifying",
  "visit_scheduled",
  "visited",
  "proposal",
  "won",
  "lost",
];

// Same stages in both funnels; a won rental is a signed contract.
const STAGES: Record<Stage, string> = {
  new: "Novo",
  qualifying: "Qualificando",
  visit_scheduled: "Visita marcada",
  visited: "Visitou",
  proposal: "Proposta",
  won: "Venda fechada",
  lost: "Perdido",
};

export function stageLabel(stage: Stage, pipeline: Pipeline): string {
  if (stage === "won" && pipeline === "rental") return "Contrato assinado";
  return STAGES[stage];
}

export const MANUAL_KINDS = { note: "Anotação", call: "Ligação", visit: "Visita" } as const;

const KINDS: Record<ActivityKind, string> = {
  created: "Cliente cadastrado",
  updated: "Dados atualizados",
  deal_opened: "Entrou no funil",
  stage_changed: "Mudou de etapa",
  next_action: "Próxima ação",
  note: MANUAL_KINDS.note,
  call: MANUAL_KINDS.call,
  visit: MANUAL_KINDS.visit,
  message: "Mensagem",
};

export function kindLabel(kind: ActivityKind): string {
  return KINDS[kind];
}

export const FIELD_LABELS: Record<string, string> = {
  name: "nome",
  phone: "telefone",
  email: "e-mail",
  source: "origem",
  notes: "observações",
  purpose: "finalidade",
  budget_max: "orçamento",
  region: "região",
  property_type: "tipo de imóvel",
  min_area_m2: "metragem",
  bedrooms: "quartos",
  parking: "vagas",
  financing: "financiamento",
  pets: "pets",
  need: "necessidade",
};

export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const WHEN = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** +5511987654321 -> (11) 98765-4321; anything else as stored. */
export function formatPhone(e164: string | null): string {
  if (!e164) return "";
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
