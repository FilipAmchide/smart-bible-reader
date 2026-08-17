import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { RTL_LANGUAGES, type Language, type ReadingPlanDetail } from "@sbr/shared-types";
import { formatDuration, summarizeChapters } from "./format-chapters.util";
import { getExportLabels } from "./plan-export-labels";

@Injectable()
export class ExcelExportService {
  async build(plan: ReadingPlanDetail, language: Language): Promise<Buffer> {
    const labels = getExportLabels(language, "xlsx");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Smart Bible Reader";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(labels.title.slice(0, 31), {
      // Excel gère le texte Unicode/arabe nativement : contrairement au PDF,
      // aucune limitation de police ici — seule la mise en page (sens de
      // lecture de la feuille) est à inverser pour les langues RTL.
      views: [{ rightToLeft: RTL_LANGUAGES.includes(language) }],
    });

    const addMergedRow = (text: string, font?: Partial<ExcelJS.Font>) => {
      const row = sheet.addRow([text]);
      sheet.mergeCells(row.number, 1, row.number, 4);
      if (font) row.getCell(1).font = font;
    };

    addMergedRow(plan.name || labels.title, { size: 16, bold: true });
    addMergedRow(labels.period.replace("{start}", plan.startDate).replace("{end}", plan.endDate));
    addMergedRow(
      labels.progress
        .replace("{percent}", String(plan.progress.percent))
        .replace("{read}", String(plan.progress.chaptersRead))
        .replace("{total}", String(plan.progress.chaptersTotal)),
    );
    if (plan.progress.readingTimeSeconds > 0) {
      addMergedRow(labels.timeSpent.replace("{duration}", formatDuration(plan.progress.readingTimeSeconds)));
    }

    const headerRow = sheet.addRow([labels.date, labels.chapters, labels.status, labels.duration]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEDF6" } };
    });

    for (const entry of plan.schedule) {
      const chaptersText = entry.chapters.length > 0 ? summarizeChapters(entry.chapters) : "";
      sheet.addRow([
        entry.date,
        chaptersText,
        labels.statusValues[entry.status],
        formatDuration(entry.readingDurationSeconds),
      ]);
    }

    sheet.columns = [{ width: 14 }, { width: 40 }, { width: 14 }, { width: 12 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
