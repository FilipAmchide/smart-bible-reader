import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import type { Language, ReadingPlanDetail } from "@sbr/shared-types";
import { formatDuration, summarizeChapters } from "./format-chapters.util";
import { getExportLabels } from "./plan-export-labels";

@Injectable()
export class PdfExportService {
  build(plan: ReadingPlanDetail, language: Language): Promise<Buffer> {
    const labels = getExportLabels(language, "pdf");
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    doc.fontSize(20).text(plan.name || labels.title, { align: "left" });
    doc
      .fontSize(11)
      .fillColor("#555555")
      .text(labels.period.replace("{start}", plan.startDate).replace("{end}", plan.endDate))
      .text(
        labels.progress
          .replace("{percent}", String(plan.progress.percent))
          .replace("{read}", String(plan.progress.chaptersRead))
          .replace("{total}", String(plan.progress.chaptersTotal)),
      );
    if (plan.progress.readingTimeSeconds > 0) {
      doc.text(labels.timeSpent.replace("{duration}", formatDuration(plan.progress.readingTimeSeconds)));
    }
    doc.moveDown(1).fillColor("#000000");

    for (const entry of plan.schedule) {
      const chaptersText = entry.chapters.length > 0 ? summarizeChapters(entry.chapters) : `(${labels.chapters}: —)`;
      const statusText = labels.statusValues[entry.status];
      const durationText = formatDuration(entry.readingDurationSeconds);

      doc.fontSize(11).fillColor("#000000").text(`${entry.date}  —  ${chaptersText}`, { continued: false });
      doc
        .fontSize(9)
        .fillColor("#777777")
        .text(`${labels.status}: ${statusText}${durationText ? `   ·   ${labels.duration}: ${durationText}` : ""}`);
      doc.moveDown(0.4);
    }

    return streamToBuffer(doc);
  }
}

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
