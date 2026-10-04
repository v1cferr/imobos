/**
 * One-shot feedback after a redirect: a Server Action or the OAuth callback appends ?toast=<key>,
 * and <FlashToast/> shows the message once and cleans the URL. Keys are fixed: nothing from the
 * query string is ever rendered as text.
 */
export type FlashType = "success" | "error" | "info";
export type Flash = { type: FlashType; title: string; description?: string };

export const FLASH: Record<string, Flash> = {
  // Connected accounts
  connected_google_calendar: { type: "success", title: "Google Agenda conectado" },
  checked: { type: "success", title: "Conexão verificada", description: "Está tudo funcionando." },
  check_failed: {
    type: "error",
    title: "A conexão está com problema",
    description: "Veja o aviso no card do serviço.",
  },
  disconnected: {
    type: "info",
    title: "Desconectado",
    description: "O acesso também foi removido da sua conta Google.",
  },
  cancelled: { type: "info", title: "Conexão cancelada na tela do Google" },
  state: {
    type: "error",
    title: "A conexão expirou",
    description: "Ela veio de outra aba ou demorou demais. Tente conectar de novo.",
  },
  scope_not_granted: {
    type: "error",
    title: "O acesso à agenda não foi liberado",
    description: "Conecte de novo e deixe a agenda marcada na tela do Google.",
  },
  no_refresh_token: { type: "error", title: "O Google não liberou o acesso contínuo", description: "Conecte de novo." },
  invalid_grant: { type: "error", title: "O Google recusou a autorização", description: "Conecte de novo." },
  not_configured: { type: "error", title: "Esta integração ainda não está configurada no servidor" },
  // User approval
  approved: { type: "success", title: "Acesso aprovado" },
  rejected: { type: "info", title: "Pedido recusado", description: "Os dados do pedido foram apagados." },
  disabled: { type: "info", title: "Acesso desativado" },
  enabled: { type: "success", title: "Acesso reativado" },
  role_changed: { type: "success", title: "Papel alterado" },
};

/** The flash for a key, or a generic error for an unknown one (never the raw key). */
export function flashFor(key: string): Flash {
  return FLASH[key] ?? { type: "error", title: "Não foi possível concluir agora", description: "Tente de novo em instantes." };
}

export function withFlash(path: string, key: keyof typeof FLASH | string): string {
  return `${path}${path.includes("?") ? "&" : "?"}toast=${encodeURIComponent(key)}`;
}
