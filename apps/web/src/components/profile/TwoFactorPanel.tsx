"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { UserProfile } from "@sbr/shared-types";
import { api, ApiError } from "@/lib/api-client";

type Phase = "idle" | "setup" | "backupCodes" | "disable";

export function TwoFactorPanel({
  user,
  onChange,
}: {
  user: UserProfile;
  onChange: (user: UserProfile) => void;
}) {
  const t = useTranslations();

  const [phase, setPhase] = useState<Phase>("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setError(null);
    setLoading(true);
    try {
      const setup = await api.setup2fa();
      setQrCodeDataUrl(setup.qrCodeDataUrl);
      setOtpauthUrl(setup.otpauthUrl);
      setSetupToken(setup.setupToken);
      setPhase("setup");
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup() {
    setError(null);
    setLoading(true);
    try {
      const { backupCodes: codes } = await api.confirm2faSetup(setupToken, confirmCode);
      setBackupCodes(codes);
      setPhase("backupCodes");
      onChange({ ...user, twoFAEnabled: true });
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function confirmDisable() {
    setError(null);
    setLoading(true);
    try {
      await api.disable2fa({ code: disableCode });
      onChange({ ...user, twoFAEnabled: false });
      setPhase("idle");
      setDisableCode("");
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }

  if (phase === "backupCodes") {
    return (
      <div className="space-y-3">
        <h3 className="font-medium text-ink">{t("auth.twoFactor.backupCodesTitle")}</h3>
        <p className="text-sm text-slate-600">{t("auth.twoFactor.backupCodesHint")}</p>
        <ul className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 font-mono text-sm">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button
          onClick={() => setPhase("idle")}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white"
        >
          {t("auth.twoFactor.backupCodesDone")}
        </button>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="space-y-3">
        <h3 className="font-medium text-ink">{t("auth.twoFactor.setupTitle")}</h3>
        <p className="text-sm text-slate-600">{t("auth.twoFactor.setupSubtitle")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, pas un hôte distant */}
        <img src={qrCodeDataUrl} alt="QR code" className="mx-auto h-40 w-40" />
        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer">{t("auth.twoFactor.manualEntry")}</summary>
          <code className="mt-1 block break-all rounded bg-slate-50 p-2 text-xs">{otpauthUrl}</code>
        </details>
        <input
          inputMode="numeric"
          maxLength={6}
          value={confirmCode}
          onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-2xl tracking-[0.5em] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={confirmSetup}
          disabled={loading || confirmCode.length !== 6}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("auth.twoFactor.enable")}
        </button>
      </div>
    );
  }

  if (phase === "disable") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">{t("auth.twoFactor.subtitle")}</p>
        <input
          inputMode="numeric"
          maxLength={6}
          value={disableCode}
          onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-2xl tracking-[0.5em] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={confirmDisable}
          disabled={loading || disableCode.length !== 6}
          className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("profile.disable2fa")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink">
          {user.twoFAEnabled ? t("profile.twoFactorEnabled") : t("profile.twoFactorDisabled")}
        </p>
        <button
          onClick={() => (user.twoFAEnabled ? setPhase("disable") : startSetup())}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          {loading ? t("common.loading") : user.twoFAEnabled ? t("profile.disable2fa") : t("profile.enable2fa")}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
