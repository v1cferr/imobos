/**
 * FIXTURE, not customer data. No real client may enter ImobOS before backups exist (V1C-88); the
 * real list comes from HubSpot (V1C-85 and later). Every name here is fictional.
 */
export type Priority = { id: string; name: string; reason: string; detail: string };

export type TodaySummary = {
  needReply: number;
  overdueFollowUps: number;
  upcomingVisits: number;
  priorities: readonly Priority[];
};

export const TODAY_FIXTURE: TodaySummary = {
  needReply: 7,
  overdueFollowUps: 2,
  upcomingVisits: 1,
  priorities: [
    { id: "f1", name: "João Silva", reason: "Último contato há 3 dias", detail: "Apartamento 2 dormitórios" },
    { id: "f2", name: "Maria Souza", reason: "Aguardando seu retorno", detail: "Pediu a tabela de preços" },
    { id: "f3", name: "Carlos Lima", reason: "Visita amanhã às 10h", detail: "Confirmar o horário" },
  ],
};
