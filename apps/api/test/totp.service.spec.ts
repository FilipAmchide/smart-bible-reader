import { ConfigService } from "@nestjs/config";
import { authenticator } from "otplib";
import { TotpService } from "../src/auth/totp.service";

function makeConfigService() {
  return { get: () => ({ totp: { issuer: "Smart Bible Reader Test" } }) } as unknown as ConfigService;
}

describe("TotpService", () => {
  const service = new TotpService(makeConfigService());

  it("génère un secret, une URL otpauth et un QR code exploitables", async () => {
    const setup = await service.generateSetup("user@example.com");
    expect(setup.secret).toMatch(/^[A-Z2-7]+$/); // base32
    expect(setup.otpauthUrl).toContain("otpauth://totp/");
    expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("valide un code TOTP généré à partir du même secret", async () => {
    const { secret } = await service.generateSetup("user@example.com");
    const token = authenticator.generate(secret);
    expect(service.verify(token, secret)).toBe(true);
  });

  it("rejette un code arbitraire", async () => {
    const { secret } = await service.generateSetup("user@example.com");
    expect(service.verify("000000", secret)).toBe(false);
  });

  it("génère des codes de secours uniques et lisibles", () => {
    const codes = service.generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    codes.forEach((c) => expect(c).toMatch(/^[0-9A-F]{4}-[0-9A-F]{6}$/));
  });
});
