import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import type {
  ChapterView,
  Language,
  ReadingPlanDetail,
  ReadingPlanSummary,
  ReadingScopeType,
  ScheduleEntryView,
} from "@sbr/shared-types";
import { BibleVersionService } from "../bible/bible-version.service";
import { User, type UserDocument } from "../users/schemas/user.schema";
import { formatDateOnly, parseDateOnly, todayUTC } from "./date-only.util";
import {
  buildChapterUnits,
  buildSchedule,
  chapterKey,
  expandRange,
  resolveScopeBooks,
} from "./plan-generator.util";
import { effectiveEntryStatus } from "./schedule-status.util";
import type { CreateReadingPlanDto } from "./dto/create-reading-plan.dto";
import type { MarkReadDto } from "./dto/mark-read.dto";
import { ReadingLog, type ReadingLogDocument } from "./schemas/reading-log.schema";
import {
  ReadingPlan,
  type ReadingPlanDocument,
  type ScheduleEntrySchemaClass,
} from "./schemas/reading-plan.schema";

const SCOPE_LABELS: Record<ReadingScopeType, string> = {
  full_bible: "Bible entière",
  old_testament: "Ancien Testament",
  new_testament: "Nouveau Testament",
  prophets: "Les prophètes",
  psalms: "Psaumes",
  proverbs: "Proverbes",
  custom: "Sélection personnalisée",
};

@Injectable()
export class ReadingPlansService {
  constructor(
    @InjectModel(ReadingPlan.name) private readonly planModel: Model<ReadingPlanDocument>,
    @InjectModel(ReadingLog.name) private readonly logModel: Model<ReadingLogDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly bibleVersionService: BibleVersionService,
  ) {}

  // ---------------------------------------------------------------------
  // Création
  // ---------------------------------------------------------------------

  async create(userId: string, dto: CreateReadingPlanDto): Promise<ReadingPlanDetail> {
    const startDate = parseDateOnly(dto.startDate);
    const endDate = parseDateOnly(dto.endDate);
    const books = resolveScopeBooks(dto.scopeType, dto.bookCodes);
    const units = buildChapterUnits(books);
    if (units.length === 0) {
      throw new BadRequestException("Aucun chapitre à planifier pour ce périmètre.");
    }
    const days = buildSchedule(units, startDate, endDate);

    const plan = await this.planModel.create({
      userId,
      name: dto.name?.trim() || `${SCOPE_LABELS[dto.scopeType]} — ${dto.startDate} au ${dto.endDate}`,
      scopeType: dto.scopeType,
      bookCodes: books.map((b) => b.code),
      startDate,
      endDate,
      status: "active",
      totalChapters: units.length,
      schedule: days.map((d) => ({
        date: parseDateOnly(d.date),
        chapters: d.chapters,
        status: d.chapters.length === 0 ? "rest" : "pending",
      })),
    });

    return this.toDetail(plan, userId);
  }

  // ---------------------------------------------------------------------
  // Consultation
  // ---------------------------------------------------------------------

  async findAllForUser(userId: string): Promise<ReadingPlanSummary[]> {
    const plans = await this.planModel.find({ userId }).sort({ createdAt: -1 });
    const counts = await this.logModel.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: { _id: "$planId", n: { $sum: 1 } } },
    ]);
    const readByPlan = new Map(counts.map((c) => [c._id.toString(), c.n]));
    return plans.map((plan) => this.toSummary(plan, readByPlan.get(plan.id) ?? 0));
  }

  async findOneDetail(userId: string, planId: string): Promise<ReadingPlanDetail> {
    const plan = await this.getOwnedPlan(userId, planId);
    return this.toDetail(plan, userId);
  }

  /** Vue détaillée + langue de l'utilisateur — pour les exports PDF/Excel (§ export). */
  async findOneForExport(userId: string, planId: string): Promise<{ detail: ReadingPlanDetail; language: Language }> {
    const plan = await this.getOwnedPlan(userId, planId);
    const [detail, user] = await Promise.all([this.toDetail(plan, userId), this.userModel.findById(userId)]);
    return { detail, language: user?.language ?? "fr" };
  }

  // ---------------------------------------------------------------------
  // Marquage de lecture
  // ---------------------------------------------------------------------

  async markRead(userId: string, planId: string, dateStr: string, dto: MarkReadDto): Promise<ReadingPlanDetail> {
    const chapters = dto.chapters ?? [];
    if (chapters.length === 0 && dto.durationSeconds === undefined) {
      throw new BadRequestException("Fournissez au moins des chapitres lus ou une durée de lecture.");
    }

    const plan = await this.getOwnedPlan(userId, planId);
    const entry = plan.schedule.find((e) => formatDateOnly(e.date) === dateStr);
    if (!entry) throw new NotFoundException("Aucune entrée de planning à cette date pour ce plan.");

    const assignedUnits = entry.chapters.flatMap(expandRange);
    const assignedKeys = new Set(assignedUnits.map(chapterKey));

    for (const ref of chapters) {
      const key = chapterKey({ bookCode: ref.bookCode.toUpperCase(), chapter: ref.chapter });
      if (!assignedKeys.has(key)) {
        throw new BadRequestException(
          `${ref.bookCode} ${ref.chapter} n'est pas prévu le ${dateStr} pour ce plan.`,
        );
      }
    }

    if (chapters.length > 0) {
      await Promise.all(
        chapters.map((ref) =>
          this.logModel.updateOne(
            { userId: plan.userId, planId: plan._id, bookCode: ref.bookCode.toUpperCase(), chapter: ref.chapter },
            { $setOnInsert: { readAt: new Date() } },
            { upsert: true },
          ),
        ),
      );

      const readInEntry = await this.logModel.countDocuments({
        userId: plan.userId,
        planId: plan._id,
        $or: assignedUnits.map((u) => ({ bookCode: u.bookCode, chapter: u.chapter })),
      });
      entry.status = readInEntry === 0 ? "pending" : readInEntry === assignedUnits.length ? "complete" : "partial";
      entry.completedAt = entry.status === "complete" ? new Date() : undefined;

      const totalRead = await this.logModel.countDocuments({ userId: plan.userId, planId: plan._id });
      plan.status = totalRead >= plan.totalChapters ? "completed" : "active";
    }

    if (dto.durationSeconds !== undefined) {
      entry.readingDurationSeconds = (entry.readingDurationSeconds ?? 0) + dto.durationSeconds;
    }

    await plan.save();
    return this.toDetail(plan, userId);
  }

  // ---------------------------------------------------------------------
  // Recalcul
  // ---------------------------------------------------------------------

  async recalculate(userId: string, planId: string): Promise<ReadingPlanDetail> {
    const plan = await this.getOwnedPlan(userId, planId);
    const today = todayUTC();

    if (today.getTime() > plan.endDate.getTime()) {
      throw new BadRequestException(
        "Ce plan est déjà arrivé à échéance : ajustez sa date de fin avant de recalculer.",
      );
    }

    const logs = await this.logModel.find({ userId: plan.userId, planId: plan._id });
    const readKeys = new Set(logs.map((l) => chapterKey({ bookCode: l.bookCode, chapter: l.chapter })));

    // Reconstruit la séquence complète d'origine (déterministe à partir du
    // périmètre et de l'ordre de livres figés à la création), puis retire ce
    // qui est déjà lu : le reste est, par construction, dans l'ordre canonique
    // restant à parcourir — qu'il ait été "raté" hier ou jamais atteint.
    const allUnits = buildChapterUnits(resolveScopeBooks(plan.scopeType, plan.bookCodes));
    const remainingUnits = allUnits.filter((u) => !readKeys.has(chapterKey(u)));

    if (remainingUnits.length === 0) {
      plan.status = "completed";
      await plan.save();
      return this.toDetail(plan, userId);
    }

    // Les jours strictement passés restent un historique inchangé (y compris
    // ceux manqués/partiels) ; seul aujourd'hui->fin est redistribué.
    const recalcStart = today.getTime() > plan.startDate.getTime() ? today : plan.startDate;
    const newDays = buildSchedule(remainingUnits, recalcStart, plan.endDate);

    const untouched = plan.schedule.filter((e) => e.date.getTime() < recalcStart.getTime());
    const rebuilt: ScheduleEntrySchemaClass[] = newDays.map(
      (d) =>
        ({
          date: parseDateOnly(d.date),
          chapters: d.chapters,
          status: d.chapters.length === 0 ? "rest" : "pending",
        }) as ScheduleEntrySchemaClass,
    );
    plan.schedule = [...untouched, ...rebuilt];
    plan.status = "active";

    await plan.save();
    return this.toDetail(plan, userId);
  }

  // ---------------------------------------------------------------------
  // Aides
  // ---------------------------------------------------------------------

  private async getOwnedPlan(userId: string, planId: string): Promise<ReadingPlanDocument> {
    if (!Types.ObjectId.isValid(planId)) throw new NotFoundException("Plan introuvable.");
    // Filtre systématique par userId : empêche un utilisateur de consulter
    // ou modifier le plan d'un autre via un identifiant deviné.
    const plan = await this.planModel.findOne({ _id: planId, userId });
    if (!plan) throw new NotFoundException("Plan introuvable.");
    return plan;
  }

  private async toDetail(plan: ReadingPlanDocument, userId: string): Promise<ReadingPlanDetail> {
    const [logs, user] = await Promise.all([
      this.logModel.find({ userId: plan.userId, planId: plan._id }),
      this.userModel.findById(userId),
    ]);
    const readKeys = new Set(logs.map((l) => chapterKey({ bookCode: l.bookCode, chapter: l.chapter })));
    const version = user ? await this.bibleVersionService.resolveForUser(user) : null;
    const today = todayUTC();

    const schedule: ScheduleEntryView[] = plan.schedule.map((entry) => {
      const chapters: ChapterView[] = entry.chapters.flatMap((range) =>
        expandRange(range).map((unit) => ({
          bookCode: unit.bookCode,
          chapter: unit.chapter,
          read: readKeys.has(chapterKey(unit)),
          readingUrl: version ? this.bibleVersionService.buildLink(version, unit.bookCode, unit.chapter) : null,
        })),
      );
      return {
        date: formatDateOnly(entry.date),
        status: effectiveEntryStatus(entry, today),
        chapters,
        readingDurationSeconds: entry.readingDurationSeconds ?? 0,
      };
    });

    return {
      id: plan.id,
      name: plan.name,
      scopeType: plan.scopeType,
      startDate: formatDateOnly(plan.startDate),
      endDate: formatDateOnly(plan.endDate),
      status: plan.status,
      bookCodes: plan.bookCodes,
      progress: {
        chaptersRead: readKeys.size,
        chaptersTotal: plan.totalChapters,
        percent: plan.totalChapters ? Math.round((readKeys.size / plan.totalChapters) * 100) : 0,
      },
      schedule,
    };
  }

  private toSummary(plan: ReadingPlanDocument, chaptersRead: number): ReadingPlanSummary {
    return {
      id: plan.id,
      name: plan.name,
      scopeType: plan.scopeType,
      startDate: formatDateOnly(plan.startDate),
      endDate: formatDateOnly(plan.endDate),
      status: plan.status,
      progress: {
        chaptersRead,
        chaptersTotal: plan.totalChapters,
        percent: plan.totalChapters ? Math.round((chaptersRead / plan.totalChapters) * 100) : 0,
      },
    };
  }
}
