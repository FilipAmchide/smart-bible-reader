"use client";

import { useTranslations } from "next-intl";

/** Précédent/suivant partagé par les listes paginées de la console admin
 * (utilisateurs, journal d'audit) — évite de dupliquer ce bloc deux fois. */
export function PaginationControls({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const t = useTranslations("admin.users");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
      >
        {t("previous")}
      </button>
      <span>{t("pageInfo", { page, totalPages })}</span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
      >
        {t("next")}
      </button>
    </div>
  );
}
