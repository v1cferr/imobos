/**
 * Server-side client for the api's CRM routes (ADR 0010). Same rules as internal.ts: server only,
 * and the signed-in user's e-mail goes as `actor`, which is what the history shows.
 */
import { call, InternalApiError } from "./internal";

export type LeadSource =
  | "roleta"
  | "whatsapp"
  | "meta_lead_ads"
  | "indicacao"
  | "planilha"
  | "manual"
  | "outro";
export type Purpose = "buy" | "rent";
export type Pipeline = "sales" | "rental";
export type Stage = "new" | "qualifying" | "visit_scheduled" | "visited" | "proposal" | "won" | "lost";
export type ActivityKind =
  | "created"
  | "updated"
  | "deal_opened"
  | "stage_changed"
  | "next_action"
  | "note"
  | "call"
  | "visit"
  | "message";

export type ClientFields = {
  name: string;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  notes: string | null;
  purpose: Purpose | null;
  budget_max: string | null; // decimal as text, never a float
  region: string | null;
  property_type: string | null;
  min_area_m2: number | null;
  bedrooms: number | null;
  parking: number | null;
  financing: boolean | null;
  pets: boolean | null;
  need: string | null;
};

export type Deal = {
  id: string;
  client_id: string;
  pipeline: Pipeline;
  stage: Stage;
  property: string | null;
  value: string | null;
  next_action: string | null;
  next_action_due: string | null;
  objections: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type Activity = {
  id: string;
  deal_id: string | null;
  kind: ActivityKind;
  body: string | null;
  data: Record<string, unknown> | null;
  actor: string;
  occurred_at: string;
};

export type Client = ClientFields & {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type ClientDetail = Client & { deals: Deal[]; activities: Activity[] };
export type ClientListItem = Client & { open_deals: Deal[]; last_activity_at: string | null };
export type BoardItem = Deal & { client_name: string; client_phone: string | null };

/** What the screen can tell the user; anything else is an unexpected error and throws. */
export type CrmProblem =
  | { problem: "invalid_phone" }
  | { problem: "duplicate_phone"; clientId: string }
  | { problem: "open_deal_exists" }
  | { problem: "not_found" };

export type CrmResult<T> = { ok: true; value: T } | ({ ok: false } & CrmProblem);

const PASS = [404, 409, 422] as const;

async function result<T>(response: Response): Promise<CrmResult<T>> {
  if (response.ok) return { ok: true, value: (await response.json()) as T };
  if (response.status === 404) return { ok: false, problem: "not_found" };
  const { detail } = (await response.json()) as { detail: unknown };
  if (detail === "invalid_phone") return { ok: false, problem: "invalid_phone" };
  if (detail === "open_deal_exists") return { ok: false, problem: "open_deal_exists" };
  const dup = detail as { code?: unknown; client_id?: unknown } | null;
  if (dup && typeof dup === "object" && dup.code === "duplicate_phone") {
    return { ok: false, problem: "duplicate_phone", clientId: String(dup.client_id) };
  }
  // Validation the form should have prevented: a bug, not something to show.
  throw new InternalApiError(response.status);
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const id = encodeURIComponent;

export async function listClients(filter: { q?: string; pipeline?: Pipeline } = {}): Promise<ClientListItem[]> {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.pipeline) params.set("pipeline", filter.pipeline);
  const query = params.size ? `?${params}` : "";
  return (await call(`/internal/crm/clients${query}`)).json();
}

export async function getClient(clientId: string): Promise<ClientDetail | null> {
  const response = await call(`/internal/crm/clients/${id(clientId)}`);
  return response.status === 404 ? null : response.json();
}

export async function createClient(
  body: Partial<ClientFields> & { name: string; actor: string; pipeline?: Pipeline | null; property?: string | null },
): Promise<CrmResult<ClientDetail>> {
  return result(await call("/internal/crm/clients", json("POST", body), PASS));
}

export async function updateClient(
  clientId: string,
  body: Partial<ClientFields> & { actor: string },
): Promise<CrmResult<ClientDetail>> {
  return result(await call(`/internal/crm/clients/${id(clientId)}`, json("PATCH", body), PASS));
}

export async function deleteClient(clientId: string): Promise<void> {
  await call(`/internal/crm/clients/${id(clientId)}`, { method: "DELETE" });
}

export async function openDeal(
  clientId: string,
  body: { actor: string; pipeline: Pipeline; property?: string | null },
): Promise<CrmResult<ClientDetail>> {
  return result(await call(`/internal/crm/clients/${id(clientId)}/deals`, json("POST", body), PASS));
}

export async function updateDeal(
  dealId: string,
  body: {
    actor: string;
    stage?: Stage;
    property?: string | null;
    value?: string | null;
    next_action?: string | null;
    next_action_due?: string | null;
    objections?: string | null;
    lost_reason?: string | null;
  },
): Promise<CrmResult<ClientDetail>> {
  return result(await call(`/internal/crm/deals/${id(dealId)}`, json("PATCH", body), PASS));
}

export async function addActivity(
  clientId: string,
  body: { actor: string; kind: "note" | "call" | "visit"; body: string; deal_id?: string | null },
): Promise<CrmResult<ClientDetail>> {
  return result(await call(`/internal/crm/clients/${id(clientId)}/activities`, json("POST", body), PASS));
}

export async function listBoard(pipeline: Pipeline): Promise<BoardItem[]> {
  return (await call(`/internal/crm/deals?pipeline=${pipeline}`)).json();
}

export type TodayReason = "overdue" | "due_today" | "new_lead" | "no_next_action";
export type TodayItem = { reason: TodayReason; deal: BoardItem; last_contact_at: string | null };
export type CalendarEvent = {
  title: string;
  start: string;
  end: string | null;
  all_day: boolean;
  location: string | null;
  link: string | null;
  client_id: string | null;
  client_name: string | null;
};
export type Today = {
  now: string;
  items: TodayItem[];
  events: CalendarEvent[];
  /** "ok", "not_connected", or the connection's short error code. */
  calendar: string;
};

export async function getToday(): Promise<Today> {
  return (await call("/internal/crm/today")).json();
}

export async function completeAction(dealId: string, actor: string): Promise<CrmResult<ClientDetail>> {
  return result(await call(`/internal/crm/deals/${id(dealId)}/done`, json("POST", { actor }), PASS));
}

export type Agenda = { now: string; events: CalendarEvent[]; calendar: string };

export async function getAgenda(days = 7): Promise<Agenda> {
  return (await call(`/internal/crm/agenda?days=${days}`)).json();
}
