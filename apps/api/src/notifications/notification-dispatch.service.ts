import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { NotificationChannel, NotificationType } from "@sbr/shared-types";
import { NotificationSenderService } from "../common/messaging/notification-sender.service";
import type { UserDocument } from "../users/schemas/user.schema";
import { NotificationLog, type NotificationLogDocument } from "./schemas/notification-log.schema";
import { WebPushService } from "./web-push.service";
import type { NotificationContent } from "./notification-content.util";

/**
 * Envoie un message sur chacun des canaux activés par l'utilisateur et
 * journalise chaque tentative (succès ou échec) dans `notifications`. À la
 * différence de l'OTP (AuthService), l'échec d'un canal n'interrompt jamais
 * les autres ni ne fait remonter d'exception à l'appelant : un tick du
 * planificateur ne doit pas s'arrêter parce qu'un SMS a échoué pour un
 * utilisateur au milieu du lot.
 */
@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @InjectModel(NotificationLog.name) private readonly logModel: Model<NotificationLogDocument>,
    private readonly sender: NotificationSenderService,
    private readonly webPush: WebPushService,
  ) {}

  /**
   * `sentAt` est l'instant que le planificateur considérait comme "maintenant"
   * au moment de décider l'envoi (pas `new Date()` pris à l'écriture) : sans
   * ça, la déduplication ("déjà envoyé aujourd'hui") peut désynchroniser le
   * planning logique de l'horloge réelle, en particulier autour d'un
   * changement de jour local.
   */
  async dispatch(
    user: UserDocument,
    type: NotificationType,
    content: NotificationContent,
    sentAt: Date,
  ): Promise<void> {
    const jobs: Array<{ channel: NotificationChannel; run: () => Promise<void> }> = [];

    // Une annonce admin (§2.3) reste joignable par email même si l'utilisateur
    // a désactivé ce canal — c'est le "canal minimal" non désactivable prévu
    // par le cahier des charges ; les autres types restent soumis à la préférence.
    if ((user.notificationSettings.emailEnabled || type === "broadcast") && user.email) {
      jobs.push({ channel: "email", run: () => this.sender.sendEmail(user.email!, content.subject, content.body) });
    }
    if (user.notificationSettings.smsEnabled && user.phone) {
      jobs.push({ channel: "sms", run: () => this.sender.sendSms(user.phone!, content.body) });
    }
    if (user.notificationSettings.webPushEnabled) {
      jobs.push({
        channel: "web_push",
        run: async () => {
          await this.webPush.sendToUser(user.id, { title: content.subject, body: content.body });
        },
      });
    }

    await Promise.all(jobs.map((job) => this.runAndLog(user, type, job.channel, job.run, sentAt)));
  }

  private async runAndLog(
    user: UserDocument,
    type: NotificationType,
    channel: NotificationChannel,
    run: () => Promise<void>,
    sentAt: Date,
  ): Promise<void> {
    try {
      await run();
      await this.logModel.create({ userId: user._id, channel, type, status: "sent", sentAt });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Notification ${type}/${channel} non délivrée à ${user.id} : ${reason}`);
      await this.logModel.create({ userId: user._id, channel, type, status: "failed", sentAt }).catch(() => undefined);
    }
  }
}
