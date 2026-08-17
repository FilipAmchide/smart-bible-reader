import type { Language } from "@sbr/shared-types";

export interface PlanExportLabels {
  title: string;
  period: string; // "Du {start} au {end}"
  progress: string; // "{percent}% terminé"
  timeSpent: string; // "{duration} de lecture"
  date: string;
  chapters: string;
  status: string;
  duration: string;
  statusValues: Record<"pending" | "partial" | "complete" | "rest" | "missed", string>;
}

const FR: PlanExportLabels = {
  title: "Plan de lecture",
  period: "Du {start} au {end}",
  progress: "{percent} % terminé — {read}/{total} chapitres",
  timeSpent: "{duration} de lecture",
  date: "Date",
  chapters: "Chapitres",
  status: "Statut",
  duration: "Durée",
  statusValues: { pending: "À faire", partial: "Partiel", complete: "Terminé", rest: "Repos", missed: "Manqué" },
};

const EN: PlanExportLabels = {
  title: "Reading plan",
  period: "From {start} to {end}",
  progress: "{percent}% done — {read}/{total} chapters",
  timeSpent: "{duration} spent reading",
  date: "Date",
  chapters: "Chapters",
  status: "Status",
  duration: "Duration",
  statusValues: { pending: "To do", partial: "Partial", complete: "Done", rest: "Rest", missed: "Missed" },
};

const ES: PlanExportLabels = {
  title: "Plan de lectura",
  period: "Del {start} al {end}",
  progress: "{percent}% completado — {read}/{total} capítulos",
  timeSpent: "{duration} de lectura",
  date: "Fecha",
  chapters: "Capítulos",
  status: "Estado",
  duration: "Duración",
  statusValues: { pending: "Pendiente", partial: "Parcial", complete: "Completado", rest: "Descanso", missed: "Perdido" },
};

const DE: PlanExportLabels = {
  title: "Leseplan",
  period: "Vom {start} bis {end}",
  progress: "{percent}% erledigt — {read}/{total} Kapitel",
  timeSpent: "{duration} gelesen",
  date: "Datum",
  chapters: "Kapitel",
  status: "Status",
  duration: "Dauer",
  statusValues: { pending: "Ausstehend", partial: "Teilweise", complete: "Erledigt", rest: "Pause", missed: "Verpasst" },
};

const AR: PlanExportLabels = {
  title: "خطة القراءة",
  period: "من {start} إلى {end}",
  progress: "اكتمل {percent}٪ — {read}/{total} أصحاح",
  timeSpent: "{duration} من القراءة",
  date: "التاريخ",
  chapters: "الأصحاحات",
  status: "الحالة",
  duration: "المدة",
  statusValues: { pending: "لم تُنجز", partial: "جزئي", complete: "مكتمل", rest: "راحة", missed: "فائت" },
};

/**
 * Excel gère le texte Unicode (donc l'arabe) sans souci particulier — c'est
 * le client (Excel/Sheets) qui rend les glyphes. Le PDF, en revanche, est
 * dessiné trait par trait par pdfkit avec une police intégrée qui ne contient
 * aucun glyphe arabe (et ne gère pas la réorganisation bidi/les formes
 * contextuelles des lettres) : y écrire de l'arabe produirait des carrés
 * vides. Le PDF replie donc sur l'anglais pour `ar` ; le classeur Excel, lui,
 * reste fidèle à la langue de l'utilisateur dans tous les cas.
 */
const LABELS: Record<Language, PlanExportLabels> = { fr: FR, en: EN, es: ES, de: DE, ar: AR, bas: EN };

export function getExportLabels(language: Language, format: "pdf" | "xlsx"): PlanExportLabels {
  if (format === "pdf" && language === "ar") return EN;
  return LABELS[language] ?? FR;
}
