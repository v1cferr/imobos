import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, createMock, updateDealMock, addActivityMock, recordMock } = vi.hoisted(() => ({
  recordMock: vi.fn(),
  requireUserMock: vi.fn(),
  createMock: vi.fn(),
  updateDealMock: vi.fn(),
  addActivityMock: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/api/crm", () => ({
  createClient: createMock,
  updateDeal: updateDealMock,
  addActivity: addActivityMock,
  recordMessage: recordMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { addActivityAction, createClientAction, sendMessageAction, updateDealAction } from "./actions";

const ID = "3f2b6a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const DEAL = "9a8b7c6d-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("client actions", () => {
  beforeEach(() => {
    requireUserMock.mockReset().mockResolvedValue({ email: "corretora@example.com" });
    [createMock, updateDealMock, addActivityMock, recordMock].forEach((m) => m.mockReset());
  });

  it("quick add sends the signed-in user as actor and opens the client with a toast", async () => {
    createMock.mockResolvedValue({ ok: true, value: { id: ID } });
    await expect(
      createClientAction({}, form({ name: "Ana", phone: "11987654321", pipeline: "sales", source: "roleta" })),
    ).rejects.toThrow(`NEXT_REDIRECT:/clients/${ID}?toast=client_created`);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "corretora@example.com", name: "Ana", pipeline: "sales", source: "roleta" }),
    );
  });

  it("a duplicate phone keeps what was typed and points to the existing client", async () => {
    createMock.mockResolvedValue({ ok: false, problem: "duplicate_phone", clientId: ID });
    const state = await createClientAction({}, form({ name: "Ana", need: "2 quartos" }));
    expect(state.duplicateId).toBe(ID);
    expect(state.values?.need).toBe("2 quartos");
  });

  it("refuses an empty name before calling the api", async () => {
    expect((await createClientAction({}, form({ name: "  " }))).error).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("the deal form sends every field, so a cleared next action clears", async () => {
    updateDealMock.mockResolvedValue({ ok: true, value: {} });
    await expect(
      updateDealAction(form({ deal_id: DEAL, client_id: ID, stage: "proposal", next_action: "", value: "450.000" })),
    ).rejects.toThrow("toast=deal_updated");
    expect(updateDealMock).toHaveBeenCalledWith(DEAL, {
      actor: "corretora@example.com",
      stage: "proposal",
      property: null,
      value: "450000",
      next_action: null,
      next_action_due: null,
      lost_reason: null,
    });
  });

  it("only note, call and visit can be recorded by hand, with valid ids", async () => {
    await expect(addActivityAction(form({ client_id: ID, kind: "stage_changed", body: "x" }))).rejects.toThrow(
      "invalid activity",
    );
    await expect(addActivityAction(form({ client_id: "../x", kind: "note", body: "x" }))).rejects.toThrow(
      "invalid client_id",
    );
    expect(addActivityMock).not.toHaveBeenCalled();
  });

  it("records the message, then opens her WhatsApp with the text ready", async () => {
    recordMock.mockResolvedValue({ ok: true, value: {} });
    await expect(
      sendMessageAction(form({ client_id: ID, phone: "+5511987654321", body: "Oi, Ana!", template: "Primeiro contato" })),
    ).rejects.toThrow("NEXT_REDIRECT:https://wa.me/5511987654321?text=Oi%2C%20Ana!");
    expect(recordMock).toHaveBeenCalledWith(ID, {
      actor: "corretora@example.com",
      body: "Oi, Ana!",
      template: "Primeiro contato",
      deal_id: null,
    });
  });

  it("does nothing without a signed-in user", async () => {
    requireUserMock.mockImplementation(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });
    await expect(createClientAction({}, form({ name: "Ana" }))).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(createMock).not.toHaveBeenCalled();
  });
});
