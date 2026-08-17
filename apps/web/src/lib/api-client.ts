import type { UserProfile } from "@sbr/shared-types";

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
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, { method = "GET", body, auth = false }: RequestOptions = {}): Promise<T> {
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

  if (!res.ok) {
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

  updateProfile: (data: Partial<{ fullName: string; language: string; timezone: string }>) =>
    request<UserProfile>("/users/me", { method: "PATCH", body: data, auth: true }),

  listBibleBooks: (lang: string) => request<BibleBookView[]>(`/bible/books?lang=${lang}`),
};
