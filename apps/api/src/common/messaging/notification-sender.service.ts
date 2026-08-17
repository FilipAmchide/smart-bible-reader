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
  /** Jeton OAuth2 Orange, valable ~1h (voir getOrangeAccessToken) — réutilisé
   * entre appels plutôt que régénéré à chaque SMS. */
  private orangeToken?: { accessToken: string; expiresAt: number };

  constructor(configService: ConfigService) {
    this.config = configService.get<AppConfig>("app")!;
  }

  async sendSms(to: string, body: string): Promise<void> {
    if (this.config.sms.transport === "console") {
      this.logger.log(`[SMS → ${to}] ${body}`);
      return;
    }

    try {
      if (this.config.sms.transport === "orange") {
        await this.sendOrangeSms(to, body);
      } else {
        await this.getTwilioClient().messages.create({
          to,
          from: this.config.sms.fromNumber,
          body,
        });
      }
    } catch (err) {
      // Même logique que l'email : un OTP qui n'arrive pas doit remonter à
      // l'appelant plutôt que de laisser l'utilisateur bloqué sans le savoir.
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Échec d'envoi de SMS (${this.config.sms.transport}) à ${to} : ${reason}`);
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

  /**
   * API SMS Orange (https://developer.orange.com/apis/sms) — flux "Send SMS",
   * disponible au Cameroun. `senderAddress` figure à la fois dans l'URL
   * (encodé) et dans le corps de la requête ; voir la liste des senderAddress
   * par pays dans la doc Orange si ORANGE_SMS_SENDER_ADDRESS change de pays.
   */
  private async sendOrangeSms(to: string, body: string): Promise<void> {
    const { senderAddress, senderName, baseUrl } = this.config.sms.orange;
    if (!senderAddress) {
      throw new Error('SMS_TRANSPORT="orange" mais ORANGE_SMS_SENDER_ADDRESS n\'est pas renseigné.');
    }

    const accessToken = await this.getOrangeAccessToken();
    const senderUri = toTelUri(senderAddress);
    const url = `${baseUrl}/smsmessaging/v1/outbound/${encodeURIComponent(senderUri)}/requests`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: toTelUri(to),
          senderAddress: senderUri,
          ...(senderName ? { senderName } : {}),
          outboundSMSTextMessage: { message: body },
        },
      }),
    });

    if (!res.ok) {
      const payload = await res.text().catch(() => "");
      throw new Error(`Orange SMS API a répondu ${res.status} : ${payload}`);
    }
  }

  /** Jeton client_credentials mis en cache jusqu'à ~1 min avant son expiration
   * (expires_in vaut 3600s côté Orange) — un envoi ne redemande pas de jeton. */
  private async getOrangeAccessToken(): Promise<string> {
    if (this.orangeToken && this.orangeToken.expiresAt > Date.now()) {
      return this.orangeToken.accessToken;
    }

    const { clientId, clientSecret, baseUrl } = this.config.sms.orange;
    if (!clientId || !clientSecret) {
      throw new Error(
        'SMS_TRANSPORT="orange" mais ORANGE_SMS_CLIENT_ID/ORANGE_SMS_CLIENT_SECRET ne sont pas ' +
          "renseignés (à récupérer dans la section \"MyApps\" de developer.orange.com — voir .env.example).",
      );
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${baseUrl}/oauth/v3/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      const payload = await res.text().catch(() => "");
      throw new Error(`Orange OAuth a répondu ${res.status} : ${payload}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: string | number };
    const expiresInMs = Number(data.expires_in) * 1000;
    this.orangeToken = {
      accessToken: data.access_token,
      // Marge d'1 min pour ne jamais envoyer avec un jeton tout juste expiré.
      expiresAt: Date.now() + expiresInMs - 60_000,
    };
    return this.orangeToken.accessToken;
  }
}

/** "699965848" ou "+237699965848" → "tel:+237699965848" (jamais de "+" doublé). */
function toTelUri(phoneNumber: string): string {
  const normalized = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
  return `tel:${normalized}`;
}
