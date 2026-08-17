"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";

/**
 * Confirmation de l'identifiant après inscription (purpose=verify_identifier).
 * Le flux "se connecter par OTP" a son propre assistant dans /login — les
 * deux réutilisent la même API mais ne partagent pas d'écran, pour rester
 * chacun simple à lire.
 */
export default function VerifyOtpPage() {
  const t = useTranslations();
  const params = useSearchParams();
  const identifier = params.get("identifier") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.verifyOtp(identifier, code, "verify_identifier");
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold text-ink">{t("profile.saved")}</h1>
        <Link href="/login" className="inline-block rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
          {t("auth.login.title")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{t("auth.otp.title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("auth.otp.sentTo", { identifier })}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          required
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-2xl tracking-[0.5em] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("auth.otp.verify")}
        </button>
      </form>
    </div>
  );
}
