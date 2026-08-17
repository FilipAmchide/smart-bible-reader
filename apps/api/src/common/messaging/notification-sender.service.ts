import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";
import type { AppConfig } from "../../config/configuration";

/**
 * Abstraction d'envoi sortant (SMS, email) utilisée par l'authentification
 * pour délivrer les codes OTP. En développement (transport "console"), le
 * message est simplement loggé — pratique pour tester le parcours OTP sans
 * compte fournisseur. Le SMS reste en attente d'un fournisseur réel (phase 3,
 * Twilio/Africa's Talking…) ; cette interface ne changera pas quand il sera
 * branché.
 */
@Injectable()
export class NotificationSenderService {
  private readonly logger = new Logger(NotificationSenderService.name);
  private readonly config: AppConfig;
  private transporter?: Transporter;

  constructor(configService: ConfigService) {
    this.config = configService.get<AppConfig>("app")!;
  }

  async sendSms(to: string, body: string): Promise<void> {
    if (this.config.sms.transport === "console") {
      this.logger.log(`[SMS → ${to}] ${body}`);
      return;
    }
    // TODO(phase 3): brancher un fournisseur réel (Twilio, Africa's Talking…)
    this.logger.warn(`Transport SMS "provider" non implémenté — message non envoyé à ${to}.`);
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
      // On ne masque pas l'échec : un OTP qui n'arrive pas doit remonter à
      // l'appelant (l'utilisateur reste bloqué sinon sans le savoir), voir
      // AuthService.sendOtp qui laisse l'erreur se propager en 500.
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
}
