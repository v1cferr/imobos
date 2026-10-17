/**
 * Reads the CRM forms. Empty inputs become null (the api clears the field), numbers stay text for
 * money and integers for counts, and the date-time picker's local time is São Paulo time.
 */
import type { ClientFields, LeadSource, Pipeline, Purpose, Stage } from "@/lib/api/crm";

import { PIPELINES, PURPOSES, SOURCES, STAGE_ORDER } from "./labels";

export function text(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function int(form: FormData, name: string): number | null {
  const value = text(form, name);
  if (value === null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** "350.000" or "350000,50" -> "350000" / "350000.50"; Brazilian thousands dots are dropped. */
export function money(form: FormData, name: string): string | null {
  const value = text(form, name);
  if (value === null) return null;
  const normalized = value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? normalized : null;
}

/** Tri-state select: "yes" / "no" / "" (not asked yet). */
function yesNo(form: FormData, name: string): boolean | null {
  const value = text(form, name);
  return value === "yes" ? true : value === "no" ? false : null;
}

function oneOf<T extends string>(form: FormData, name: string, allowed: Record<T, string>): T | null {
  const value = text(form, name);
  return value !== null && value in allowed ? (value as T) : null;
}

export const pipelineOf = (form: FormData): Pipeline | null => oneOf(form, "pipeline", PIPELINES);
export const sourceOf = (form: FormData): LeadSource | null => oneOf(form, "source", SOURCES);

export function stageOf(form: FormData): Stage | null {
  const value = text(form, "stage");
  return value !== null && (STAGE_ORDER as readonly string[]).includes(value) ? (value as Stage) : null;
}

/** <input type="datetime-local"> -> ISO with São Paulo's offset (no daylight saving since 2019). */
export function localDateTime(form: FormData, name: string): string | null {
  const value = text(form, name);
  if (value === null || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return `${value}:00-03:00`;
}

/** The ISO instant shown back in the picker, in São Paulo time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const shifted = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** Every field of the full client form; the edit page sends them all, so emptied ones clear. */
export function clientFields(form: FormData): Omit<ClientFields, "name" | "source"> & {
  name: string | null;
  source: LeadSource | null;
} {
  return {
    name: text(form, "name"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    source: sourceOf(form),
    notes: text(form, "notes"),
    purpose: oneOf<Purpose>(form, "purpose", PURPOSES),
    budget_max: money(form, "budget_max"),
    region: text(form, "region"),
    property_type: text(form, "property_type"),
    min_area_m2: int(form, "min_area_m2"),
    bedrooms: int(form, "bedrooms"),
    parking: int(form, "parking"),
    financing: yesNo(form, "financing"),
    pets: yesNo(form, "pets"),
    need: text(form, "need"),
  };
}

const DAY = 24 * 60 * 60 * 1000;

/** "Amanhã" in Hoje: same time tomorrow; without a time, 9:00 tomorrow in São Paulo. */
export function tomorrowOf(due: string | null, now: Date = new Date()): string {
  if (due) return new Date(new Date(due).getTime() + DAY).toISOString();
  const sp = new Date(now.getTime() - 3 * 60 * 60 * 1000 + DAY); // São Paulo's calendar date
  return `${sp.toISOString().slice(0, 10)}T09:00:00-03:00`;
}

/**
 * A phone as she pastes it: "(11) 98765-4321", "+55 11 ...", or a WhatsApp link
 * (wa.me/5511987654321, api.whatsapp.com/send?phone=5511987654321). Links become "+<digits>";
 * anything else goes to the api as typed, which validates and normalizes it.
 */
export function pastedPhone(raw: string | null): string | null {
  if (!raw) return null;
  const link = /(?:wa\.me\/|[?&]phone=)\+?(\d{8,15})/.exec(raw);
  return link ? `+${link[1]}` : raw;
}
