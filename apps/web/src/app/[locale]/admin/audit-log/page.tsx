"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { AuditLogEntry } from "@sbr/shared-types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api } from "@/lib/api-client";
import { PaginationControls } from "@/components/admin/PaginationControls";

const PAGE_SIZE = 20;

export default function AdminAuditLogPage() {
  const t = useTranslations("admin.auditLog");
  usePageTitle(t("title"));
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ items: AuditLogEntry[]; total: number } | null>(null);

  useEffect(() => {
    api
      .adminListAuditLog({ page, pageSize: PAGE_SIZE })
      .then(setResult)
      .catch(() => setResult({ items: [], total: 0 }));
  }, [page]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>

      {result === null && <p className="text-center text-slate-500">…</p>}
      {result?.items.length === 0 && <p className="text-center text-slate-500">{t("empty")}</p>}

      <ul className="space-y-3">
        {result?.items.map((entry) => (
          <li key={entry.id} className="space-y-1 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              {/* next-intl interdit le "." dans une clé (réservé à l'imbrication) —
                  AdminAuditAction en contient ("broadcast.send"...), d'où la clé
                  soeur "broadcast_send" côté traductions (voir admin.auditLog.actions). */}
              <span className="font-medium text-ink">{t(`actions.${entry.action.replace(/\./g, "_")}`)}</span>
              <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-500">
              {t("admin")}: {entry.adminFullName}
              {entry.targetId && ` · ${entry.targetType} ${entry.targetId}`}
            </p>
          </li>
        ))}
      </ul>

      {result && (
        <PaginationControls page={page} pageSize={PAGE_SIZE} total={result.total} onChange={setPage} />
      )}
    </div>
  );
}
