import type {
  AdminUserDetail,
  AdminUserSummary,
  AuditLogEntry,
  BibleVersion,
  BibleVersionAdmin,
  BroadcastRequest,
  BroadcastResult,
  DashboardSummary,
  Language,
  NotificationChannel,
  NotificationSettings,
  Paginated,
  PlatformStats,
  ReadingPlanDetail,
  ReadingPlanSummary,
  ReadingScopeType,
  UserProfile,
} from "@sbr/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Jetons en localStorage pour ce scaffold de phase 1 — à faire évoluer vers
// des cookies httpOnly avant mise en production (protection XSS).
const ACCESS_KEY = "sbr.accessToken";
const REFRESH_KEY = "sbr.refreshToken";

export const tokenStore = {
  getAccess: () => (typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY)),
  getRefresh: () => (typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY)),
  set: (accessToken: string, refreshToken: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

/**
 * Rafraîchissement silencieux du access token via le refresh token stocké.
 * Un seul appel réseau à la fois même si plusieurs requêtes échouent en 401
 * en parallèle (single-flight) — l'API fait tourner le refresh token à
 * chaque appel, un doublon invaliderait le premier.
 *
 * Tant que ce refresh réussit (refresh token non expiré), la session ne
 * meurt jamais toute seule : seul un appel explicite à tokenStore.clear()
 * (bouton "se déconnecter") y met fin. Voir JWT_REFRESH_TTL dans
 * apps/api/.env.example pour la durée réelle avant expiration forcée.
 */
let refreshPromise: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return Promise.resolve(false);

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const tokens = (await res.json()) as TokenPair;
        tokenStore.set(tokens.accessToken, tokens.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  { method = "GET", body, auth = false }: RequestOptions = {},
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = tokenStore.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "networkError");
  }

  // Access token expiré (15 min) : on tente un refresh silencieux une seule
  // fois puis on rejoue la requête, plutôt que de faire échouer l'appel et
  // pousser l'utilisateur vers /login pour une session encore valide.
  if (res.status === 401 && auth && !retried && (await refreshAccessToken())) {
    return request<T>(path, { method, body, auth }, true);
  }

  if (!res.ok) {
    if (res.status === 401 && auth) tokenStore.clear();
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(res.status, payload.message ?? "genericError");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface FirstFactorResult {
  requires2FA: boolean;
  preAuthToken?: string;
  tokens?: TokenPair;
  user?: UserProfile;
}

/**
 * Les exports PDF/Excel exigent le jeton d'authentification, donc un simple
 * `<a href>` ne suffit pas (pas d'en-tête Authorization sur une navigation).
 * On récupère le fichier en JS puis on déclenche le téléchargement via une
 * URL d'objet temporaire, sans jamais exposer le jeton dans l'URL elle-même.
 */
async function downloadFile(path: string, filename: string, retried = false): Promise<void> {
  const token = tokenStore.getAccess();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError(0, "networkError");
  }

  if (res.status === 401 && !retried && (await refreshAccessToken())) {
    return downloadFile(path, filename, true);
  }
  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    throw new ApiError(res.status, "genericError");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface BibleBookView {
  code: string;
  name: string;
  testament: string;
  category: string;
  chapterCount: number;
  canonicalOrder: number;
}

export const api = {
  register: (data: { fullName: string; email?: string; phone?: string; password?: string }) =>
    request<{ user: UserProfile; otpSent: boolean }>("/auth/register", { method: "POST", body: data }),

  requestOtp: (identifier: string, purpose?: "login" | "verify_identifier") =>
    request<{ sent: true; expiresInSeconds: number }>("/auth/otp/request", {
      method: "POST",
      body: { identifier, purpose },
    }),

  verifyOtp: (identifier: string, code: string, purpose?: "login" | "verify_identifier") =>
    request<FirstFactorResult>("/auth/otp/verify", { method: "POST", body: { identifier, code, purpose } }),

  login: (identifier: string, password: string) =>
    request<FirstFactorResult>("/auth/login", { method: "POST", body: { identifier, password } }),

  verify2fa: (preAuthToken: string, credentials: { code?: string; backupCode?: string }) =>
    request<{ tokens: TokenPair; user: UserProfile }>("/auth/2fa/verify", {
      method: "POST",
      body: { preAuthToken, ...credentials },
    }),

  setup2fa: () =>
    request<{ otpauthUrl: string; qrCodeDataUrl: string; setupToken: string }>("/auth/2fa/setup", {
      method: "POST",
      auth: true,
    }),

  confirm2faSetup: (setupToken: string, code: string) =>
    request<{ backupCodes: string[] }>("/auth/2fa/confirm", {
      method: "POST",
      body: { setupToken, code },
      auth: true,
    }),

  disable2fa: (credentials: { code?: string; backupCode?: string }) =>
    request<void>("/auth/2fa/disable", { method: "POST", body: credentials, auth: true }),

  me: () => request<UserProfile>("/users/me", { auth: true }),

  updateProfile: (
    data: Partial<{ fullName: string; language: string; timezone: string; preferredVersionCode: string }>,
  ) => request<UserProfile>("/users/me", { method: "PATCH", body: data, auth: true }),

  updateNotificationSettings: (data: Partial<NotificationSettings>) =>
    request<UserProfile>("/users/me/notifications", { method: "PATCH", body: data, auth: true }),

  listBibleBooks: (lang: string) => request<BibleBookView[]>(`/bible/books?lang=${lang}`),

  listBibleVersions: (lang?: string) =>
    request<BibleVersion[]>(`/bible/versions${lang ? `?lang=${lang}` : ""}`),

  // -- Plans de lecture (phase 2) -----------------------------------------

  createPlan: (data: {
    name?: string;
    scopeType: ReadingScopeType;
    bookCodes?: string[];
    startDate: string;
    endDate: string;
  }) => request<ReadingPlanDetail>("/reading-plans", { method: "POST", body: data, auth: true }),

  listPlans: () => request<ReadingPlanSummary[]>("/reading-plans", { auth: true }),

  getPlan: (id: string) => request<ReadingPlanDetail>(`/reading-plans/${id}`, { auth: true }),

  markRead: (
    planId: string,
    date: string,
    chapters?: Array<{ bookCode: string; chapter: number }>,
    durationSeconds?: number,
  ) =>
    request<ReadingPlanDetail>(`/reading-plans/${planId}/entries/${date}`, {
      method: "PATCH",
      body: { chapters, durationSeconds },
      auth: true,
    }),

  recalculatePlan: (planId: string) =>
    request<ReadingPlanDetail>(`/reading-plans/${planId}/recalculate`, { method: "POST", auth: true }),

  exportPlanPdf: (planId: string, filename: string) =>
    downloadFile(`/reading-plans/${planId}/export/pdf`, filename),

  exportPlanXlsx: (planId: string, filename: string) =>
    downloadFile(`/reading-plans/${planId}/export/xlsx`, filename),

  // -- Dashboard (phase 3) -------------------------------------------------

  getDashboard: () => request<DashboardSummary>("/dashboard", { auth: true }),

  // -- Abonnements Web Push (phase 3) --------------------------------------

  registerDevice: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<void>("/devices", { method: "POST", body: subscription, auth: true }),

  unregisterDevice: (endpoint: string) =>
    request<void>("/devices", { method: "DELETE", body: { endpoint }, auth: true }),

  // -- Admin (phase 4) ------------------------------------------------------

  adminListUsers: (params: {
    search?: string;
    language?: Language;
    notificationChannel?: NotificationChannel;
    page?: number;
    pageSize?: number;
  }) =>
    request<Paginated<AdminUserSummary>>(`/admin/users${buildQuery(params)}`, { auth: true }),

  adminGetUser: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`, { auth: true }),

  adminGetStats: () => request<PlatformStats>("/admin/stats", { auth: true }),

  adminSendBroadcast: (dto: BroadcastRequest) =>
    request<BroadcastResult>("/admin/broadcast", { method: "POST", body: dto, auth: true }),

  adminListBibleVersions: () => request<BibleVersionAdmin[]>("/admin/bible-versions", { auth: true }),

  adminCreateBibleVersion: (
    dto: Pick<BibleVersionAdmin, "code" | "language" | "name" | "provider" | "linkTemplate">,
  ) => request<BibleVersionAdmin>("/admin/bible-versions", { method: "POST", body: dto, auth: true }),

  adminUpdateBibleVersion: (
    code: string,
    dto: Partial<Pick<BibleVersionAdmin, "name" | "provider" | "linkTemplate" | "active">>,
  ) =>
    request<BibleVersionAdmin>(`/admin/bible-versions/${code}`, { method: "PATCH", body: dto, auth: true }),

  adminListAuditLog: (params: { action?: string; page?: number; pageSize?: number }) =>
    request<Paginated<AuditLogEntry>>(`/admin/audit-log${buildQuery(params)}`, { auth: true }),
};

/** Sérialise les paramètres non vides d'une requête admin en query string. */
function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
