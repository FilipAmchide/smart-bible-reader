import type { ConfigService } from "@nestjs/config";
import { NotificationSenderService } from "../src/common/messaging/notification-sender.service";
import type { AppConfig } from "../src/config/configuration";

/** Config minimale suffisante pour NotificationSenderService, avec le
 * transport SMS "orange" activé — même approche que test/otp.service.spec.ts
 * (fake léger plutôt qu'un vrai ConfigService/module Nest). */
function makeConfigService(overrides: Partial<AppConfig["sms"]["orange"]> = {}): ConfigService {
  const app: Pick<AppConfig, "sms" | "email"> = {
    sms: {
      transport: "orange",
      accountSid: "",
      authToken: "",
      fromNumber: "",
      orange: {
        clientId: "client-id",
        clientSecret: "client-secret",
        senderAddress: "+2370000",
        senderName: "",
        baseUrl: "https://api.orange.test",
        ...overrides,
      },
    },
    email: {
      transport: "console",
      from: "Smart Bible Reader <no-reply@smartbiblereader.app>",
      smtpUrl: "",
      smtpHost: "",
      smtpUser: "",
      smtpPassword: "",
      smtpSecure: true,
    },
  };
  return { get: () => app } as unknown as ConfigService;
}

function fetchResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("NotificationSenderService — transport Orange SMS", () => {
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("obtient un jeton OAuth puis envoie le SMS au bon endpoint, avec le bon corps", async () => {
    fetchMock
      .mockResolvedValueOnce(fetchResponse(200, { token_type: "Bearer", access_token: "tok-1", expires_in: "3600" }))
      .mockResolvedValueOnce(fetchResponse(201, { outboundSMSMessageRequest: {} }));

    const service = new NotificationSenderService(makeConfigService());
    await service.sendSms("+237699965848", "Votre code : 123456");

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://api.orange.test/oauth/v3/token");
    expect(tokenInit.headers.Authorization).toBe(`Basic ${Buffer.from("client-id:client-secret").toString("base64")}`);
    expect(tokenInit.body).toBe("grant_type=client_credentials");

    const [smsUrl, smsInit] = fetchMock.mock.calls[1];
    expect(smsUrl).toBe(
      `https://api.orange.test/smsmessaging/v1/outbound/${encodeURIComponent("tel:+2370000")}/requests`,
    );
    expect(smsInit.headers.Authorization).toBe("Bearer tok-1");
    const payload = JSON.parse(smsInit.body);
    expect(payload.outboundSMSMessageRequest).toEqual({
      address: "tel:+237699965848",
      senderAddress: "tel:+2370000",
      outboundSMSTextMessage: { message: "Votre code : 123456" },
    });
  });

  it("réutilise le jeton en cache pour un second envoi (pas de second appel OAuth)", async () => {
    fetchMock
      .mockResolvedValueOnce(fetchResponse(200, { access_token: "tok-1", expires_in: "3600" }))
      .mockResolvedValueOnce(fetchResponse(201, {}))
      .mockResolvedValueOnce(fetchResponse(201, {}));

    const service = new NotificationSenderService(makeConfigService());
    await service.sendSms("+237699965848", "Premier message");
    await service.sendSms("+237699965848", "Second message");

    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 token + 2 SMS
  });

  it("inclut senderName quand il est configuré (blanchi côté Orange)", async () => {
    fetchMock
      .mockResolvedValueOnce(fetchResponse(200, { access_token: "tok-1", expires_in: "3600" }))
      .mockResolvedValueOnce(fetchResponse(201, {}));

    const service = new NotificationSenderService(makeConfigService({ senderName: "SBR" }));
    await service.sendSms("+237699965848", "Hello");

    const payload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(payload.outboundSMSMessageRequest.senderName).toBe("SBR");
  });

  it("rejette clairement si les identifiants OAuth Orange sont absents", async () => {
    const service = new NotificationSenderService(makeConfigService({ clientId: "", clientSecret: "" }));
    await expect(service.sendSms("+237699965848", "Hello")).rejects.toThrow(/ORANGE_SMS_CLIENT_ID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propage une erreur explicite si l'API Orange répond en échec", async () => {
    fetchMock
      .mockResolvedValueOnce(fetchResponse(200, { access_token: "tok-1", expires_in: "3600" }))
      .mockResolvedValueOnce(fetchResponse(400, { code: 42, message: "Bad sender name" }));

    const service = new NotificationSenderService(makeConfigService());
    await expect(service.sendSms("+237699965848", "Hello")).rejects.toThrow(/400/);
  });
});
