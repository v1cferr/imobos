/**
 * Ready-made messages (V1C-117): placeholders filled per client, and the click-to-chat link that
 * opens her own WhatsApp with the text ready. Nothing is sent by ImobOS.
 */
import type { ClientDetail, Deal } from "@/lib/api/crm";

export const PLACEHOLDERS = {
  "{nome}": "primeiro nome do cliente",
  "{nome_completo}": "nome completo do cliente",
  "{empreendimento}": "empreendimento ou imóvel do negócio (ou \"imóvel\")",
  "{proxima_acao}": "a próxima ação marcada",
  "{corretora}": "o seu primeiro nome",
} as const;

export function fillTemplate(
  body: string,
  context: { client: Pick<ClientDetail, "name">; deal?: Pick<Deal, "property" | "next_action"> | null; broker: string | null },
): string {
  const values: Record<keyof typeof PLACEHOLDERS, string> = {
    "{nome}": context.client.name.trim().split(/\s+/)[0] ?? "",
    "{nome_completo}": context.client.name.trim(),
    "{empreendimento}": context.deal?.property?.trim() || "imóvel",
    "{proxima_acao}": context.deal?.next_action?.trim() ?? "",
    "{corretora}": context.broker?.trim().split(/\s+/)[0] ?? "",
  };
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(key, value), body);
}

/** wa.me wants the number in digits only, country code first. */
export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
