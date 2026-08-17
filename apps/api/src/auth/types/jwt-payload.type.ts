import type { Role } from "@sbr/shared-types";

/** Contenu d'un access token JWT une fois vérifié et décodé. */
export interface JwtPayload {
  /** Identifiant utilisateur (Mongo _id en string). */
  sub: string;
  role: Role;
}

/** Contenu du jeton temporaire émis entre l'étape 1 (mot de passe/OTP) et le 2FA. */
export interface Pre2faPayload {
  sub: string;
  purpose: "pre-2fa";
}

/**
 * Porte le secret TOTP fraîchement généré entre /auth/2fa/setup et
 * /auth/2fa/confirm, le temps que l'utilisateur scanne le QR code — le
 * secret n'est persisté qu'une fois le premier code confirmé.
 */
export interface Setup2faPayload {
  sub: string;
  secret: string;
  purpose: "2fa-setup";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
