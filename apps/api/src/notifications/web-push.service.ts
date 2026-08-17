import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as webPush from "web-push";
import type { AppConfig } from "../config/configuration";
import { DevicesService } from "../devices/devices.service";

export interface WebPushPayload {
  title: string;
  body: string;
  /** URL ouverte au clic (ex. le plan concerné) — optionnelle. */
  url?: string;
}

/**
 * Envoi Web Push — séparé de NotificationSenderService car il dépend des
 * abonnements par appareil (DevicesService), pas juste d'un identifiant de
 * contact. Un abonnement expiré (410 Gone) est retiré silencieusement : ce
 * n'est pas une erreur applicative, juste un appareil qui ne l'est plus.
 */
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly config: AppConfig;
  private configured = false;

  constructor(
    configService: ConfigService,
    private readonly devicesService: DevicesService,
  ) {
    this.config = configService.get<AppConfig>("app")!;
  }

  private ensureConfigured(): void {
    if (this.configured) return;
    const { publicKey, privateKey, contact } = this.config.webPush;
    if (!publicKey || !privateKey) {
      throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY manquantes (voir .env.example).");
    }
    webPush.setVapidDetails(contact, publicKey, privateKey);
    this.configured = true;
  }

  async sendToUser(userId: string, payload: WebPushPayload): Promise<{ sent: number; removed: number }> {
    const devices = await this.devicesService.findByUser(userId);
    if (devices.length === 0) return { sent: 0, removed: 0 };

    this.ensureConfigured();
    let sent = 0;
    let removed = 0;

    await Promise.all(
      devices.map(async (device) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: device.endpoint,
              keys: { p256dh: device.p256dh, auth: device.auth },
            },
            JSON.stringify(payload),
          );
          sent += 1;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.devicesService.removeById(device.id);
            removed += 1;
            return;
          }
          const reason = err instanceof Error ? err.message : String(err);
          this.logger.error(`Échec d'envoi push à l'appareil ${device.id} : ${reason}`);
        }
      }),
    );

    return { sent, removed };
  }
}
