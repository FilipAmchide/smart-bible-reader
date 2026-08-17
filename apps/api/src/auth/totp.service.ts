import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { authenticator } from "otplib";
import { randomBytes } from "crypto";
import * as QRCode from "qrcode";
import type { AppConfig } from "../config/configuration";

authenticator.options = { window: 1 }; // tolérance ±30s autour du pas courant

export interface TotpSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

@Injectable()
export class TotpService {
  private readonly config: AppConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<AppConfig>("app")!;
  }

  async generateSetup(accountLabel: string): Promise<TotpSetup> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(accountLabel, this.config.totp.issuer, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  verify(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  /** 10 codes de secours lisibles (ex. "K3F9-7QRT"), à hasher avant persistance. */
  generateBackupCodes(count = 10): string[] {
    return Array.from({ length: count }, () => {
      const raw = randomBytes(5).toString("hex").toUpperCase(); // 10 caractères hex
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}${raw.slice(8, 10)}`;
    });
  }
}
