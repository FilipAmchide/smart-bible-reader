"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError, tokenStore, type FirstFactorResult } from "@/lib/api-client";

type Mode = "otp" | "password";
type Step = "form" | "otp" | "twoFactor";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("otp");
  const [step, setStep] = useState<Step>("form");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [preAuthToken, setPreAuthToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFirstFactorResult(result: FirstFactorResult) {
    if (result.requires2FA && result.preAuthToken) {
      setPreAuthToken(result.preAuthToken);
      setStep("twoFactor");
      return;
    }
    if (result.tokens) {
      tokenStore.set(result.tokens.accessToken, result.tokens.refreshToken);
      router.replace("/dashboard");
    }
  }

  async function runWithErrorHandling(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }

  function onRequestOtp(e: FormEvent) {
    e.preventDefault();
    void runWithErrorHandling(async () => {
      await api.requestOtp(identifier, "login");
      setStep("otp");
    });
  }

  function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    void runWithErrorHandling(async () => {
      const result = await api.verifyOtp(identifier, code, "login");
      handleFirstFactorResult(result);
    });
  }

  function onPasswordLogin(e: FormEvent) {
    e.preventDefault();
    void runWithErrorHandling(async () => {
      const result = await api.login(identifier, password);
      handleFirstFactorResult(result);
    });
  }

  function onVerify2fa(e: FormEvent) {
    e.preventDefault();
    void runWithErrorHandling(async () => {
      const { tokens } = await api.verify2fa(
        preAuthToken,
        useBackupCode ? { backupCode: totpCode } : { code: totpCode },
      );
      tokenStore.set(tokens.accessToken, tokens.refreshToken);
      router.replace("/dashboard");
    });
  }

  if (step === "twoFactor") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">{t("auth.twoFactor.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("auth.twoFactor.subtitle")}</p>
        </div>
        <form onSubmit={onVerify2fa} className="space-y-4">
          <input
            required
            inputMode={useBackupCode ? "text" : "numeric"}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder={useBackupCode ? "XXXX-XXXXXX" : "••••••"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg tracking-widest text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("auth.twoFactor.verify")}
          </button>
          <button
            type="button"
            onClick={() => {
              setUseBackupCode((v) => !v);
              setTotpCode("");
            }}
            className="w-full text-center text-sm text-accent"
          >
            {t("auth.twoFactor.useBackupCode")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{t("auth.login.title")}</h1>
      </div>

      {mode === "otp" && step === "form" && (
        <form onSubmit={onRequestOtp} className="space-y-4">
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-ink">{t("auth.login.identifier")}</span>
            <input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("auth.login.withOtp")}
          </button>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {t("auth.login.orDivider")}
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button
            type="button"
            onClick={() => setMode("password")}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-ink"
          >
            {t("auth.login.withPassword")}
          </button>
        </form>
      )}

      {mode === "otp" && step === "otp" && (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <p className="text-sm text-slate-600">{t("auth.otp.sentTo", { identifier })}</p>
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
          <button
            type="button"
            onClick={() => setStep("form")}
            className="w-full text-center text-sm text-accent"
          >
            {t("auth.otp.changeIdentifier")}
          </button>
        </form>
      )}

      {mode === "password" && (
        <form onSubmit={onPasswordLogin} className="space-y-4">
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-ink">{t("auth.login.identifier")}</span>
            <input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-ink">{t("auth.login.password")}</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("auth.login.title")}
          </button>
          <button
            type="button"
            onClick={() => setMode("otp")}
            className="w-full text-center text-sm text-accent"
          >
            {t("auth.login.withOtp")}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-600">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="font-medium text-accent">
          {t("auth.login.register")}
        </Link>
      </p>
    </div>
  );
}
