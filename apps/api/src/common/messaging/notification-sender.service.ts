import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";
import { Twilio } from "twilio";
import type { AppConfig } from "../../config/configuration";

/**
 * Abstraction d'envoi sortant (SMS, email) utilisée par l'authentification
 * pour délivrer les codes OTP, et réutilisée par le moteur de notifications
 * (phase 3) pour les rappels/alertes. En développement (transport "console"),
 * le message est simplement loggé — pratique pour tester sans compte
 * fournisseur. Le Web Push, qui a besoin des abonnements par appareil, vit à
 * part dans `notifications/web-push.service.ts` plutôt qu'ici.
 */
@Injectable()
export class NotificationSenderService {
  private readonly logger = new Logger(NotificationSenderService.name);
  private readonly config: AppConfig;
  private transporter?: Transporter;
  private twilioClient?: Twilio;

  constructor(configService: ConfigService) {
    this.config = configService.get<AppConfig>("app")!;
  }

  async sendSms(to: string, body: string): Promise<void> {
    if (this.config.sms.transport === "console") {
      this.logger.log(`[SMS → ${to}] ${body}`);
      return;
    }

    try {
      await this.getTwilioClient().messages.create({
        to,
        from: this.config.sms.fromNumber,
        body,
      });
    } catch (err) {
      // Même logique que l'email : un OTP qui n'arrive pas doit remonter à
      // l'appelant plutôt que de laisser l'utilisateur bloqué sans le savoir.
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Échec d'envoi de SMS Twilio à ${to} : ${reason}`);
      throw err;
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (this.config.email.transport === "console") {
      this.logger.log(`[Email → ${to}] ${subject}\n${body}`);
      return;
    }

    try {
      await this.getTransporter().sendMail({
        from: this.config.email.from,
        to,
        subject,
        text: body,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Échec d'envoi d'email SMTP à ${to} : ${reason}`);
      throw err;
    }
  }

  /** Construit le transporteur SMTP à la première utilisation et le réutilise ensuite. */
  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const { smtpUrl, smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure } = this.config.email;

    if (smtpUrl) {
      this.transporter = createTransport(smtpUrl);
    } else if (smtpHost) {
      this.transporter = createTransport({
        host: smtpHost,
        port: smtpPort ?? (smtpSecure ? 465 : 587),
        secure: smtpSecure,
        auth: smtpUser ? { user: smtpUser, pass: smtpPassword } : undefined,
      });
    } else {
      throw new Error(
        'EMAIL_TRANSPORT="smtp" mais ni SMTP_URL ni SMTP_HOST ne sont renseignés (voir .env.example).',
      );
    }

    return this.transporter;
  }

  private getTwilioClient(): Twilio {
    if (this.twilioClient) return this.twilioClient;

    const { accountSid, authToken, fromNumber } = this.config.sms;
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        'SMS_TRANSPORT="twilio" mais TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER ' +
          "ne sont pas tous renseignés (voir .env.example).",
      );
    }
    this.twilioClient = new Twilio(accountSid, authToken);
    return this.twilioClient;
  }
}
