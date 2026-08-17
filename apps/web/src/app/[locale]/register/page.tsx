"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      await api.register({
        fullName,
        email: isEmail ? identifier : undefined,
        phone: isEmail ? undefined : identifier,
        password: password || undefined,
      });
      router.push(`/verify-otp?identifier=${encodeURIComponent(identifier)}&purpose=verify_identifier`);
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{t("auth.register.title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("auth.register.subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("auth.register.fullName")}</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("auth.register.identifier")}</span>
          <input
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="vous@exemple.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("auth.register.password")}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <span className="mt-1 block text-xs text-slate-500">{t("auth.register.passwordHint")}</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("auth.register.submit")}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        {t("auth.register.hasAccount")}{" "}
        <Link href="/login" className="font-medium text-accent">
          {t("auth.register.login")}
        </Link>
      </p>
    </div>
  );
}
