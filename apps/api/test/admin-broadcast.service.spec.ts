import { AdminBroadcastService } from "../src/admin/admin-broadcast.service";

function fakeUser(id: string, language: string) {
  return { id, language };
}

describe("AdminBroadcastService", () => {
  it("diffuse à tous les utilisateurs quand aucune langue n'est ciblée et journalise l'action", async () => {
    const users = [fakeUser("u1", "fr"), fakeUser("u2", "en")];
    const userModel = { find: jest.fn().mockResolvedValue(users) };
    const dispatchService = { dispatch: jest.fn().mockResolvedValue(undefined) };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };

    const service = new AdminBroadcastService(userModel as any, dispatchService as any, auditLogService as any);
    const result = await service.send("admin1", { subject: "Sujet", body: "Message" });

    expect(userModel.find).toHaveBeenCalledWith({});
    expect(dispatchService.dispatch).toHaveBeenCalledTimes(2);
    expect(dispatchService.dispatch).toHaveBeenCalledWith(
      users[0],
      "broadcast",
      { subject: "Sujet", body: "Message" },
      expect.any(Date),
    );
    expect(result).toEqual({ recipientCount: 2 });

    expect(auditLogService.record).toHaveBeenCalledWith(
      "admin1",
      "broadcast.send",
      "user",
      undefined,
      expect.objectContaining({ subject: "Sujet", language: "all", recipientCount: 2 }),
    );
  });

  it("filtre par langue quand elle est précisée", async () => {
    const userModel = { find: jest.fn().mockResolvedValue([fakeUser("u1", "fr")]) };
    const dispatchService = { dispatch: jest.fn().mockResolvedValue(undefined) };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };

    const service = new AdminBroadcastService(userModel as any, dispatchService as any, auditLogService as any);
    await service.send("admin1", { subject: "Sujet", body: "Message", language: "fr" });

    expect(userModel.find).toHaveBeenCalledWith({ language: "fr" });
    expect(dispatchService.dispatch).toHaveBeenCalledTimes(1);
  });
});
