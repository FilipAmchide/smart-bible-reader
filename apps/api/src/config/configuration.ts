export interface AppConfig {
  port: number;
  corsOrigin: string;
  mongodbUri: string;
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshSecret: string;
    refreshTtl: string;
    pre2faSecret: string;
    pre2faTtl: string;
  };
  secretsEncryptionKey: string;
  otp: {
    ttlSeconds: number;
    length: number;
    maxAttempts: number;
  };
  totp: {
    issuer: string;
  };
  sms: {
    transport: "console" | "provider";
    apiKey: string;
  };
  email: {
    transport: "console" | "smtp";
    from: string;
    /** Si renseignée, prime sur les champs SMTP_* discrets ci-dessous. */
    smtpUrl: string;
    smtpHost: string;
    smtpPort?: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
  };
}

export default (): { app: AppConfig } => ({
  app: {
    port: parseInt(process.env.PORT ?? "3001", 10),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/smart_bible_reader",
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
      accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
      refreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
      pre2faSecret: process.env.JWT_PRE_2FA_SECRET ?? "dev-pre-2fa-secret",
      pre2faTtl: process.env.JWT_PRE_2FA_TTL ?? "5m",
    },
    secretsEncryptionKey:
      process.env.SECRETS_ENCRYPTION_KEY ?? "0".repeat(64),
    otp: {
      ttlSeconds: parseInt(process.env.OTP_TTL_SECONDS ?? "300", 10),
      length: parseInt(process.env.OTP_LENGTH ?? "6", 10),
      maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? "5", 10),
    },
    totp: {
      issuer: process.env.TOTP_ISSUER ?? "Smart Bible Reader",
    },
    sms: {
      transport: (process.env.SMS_TRANSPORT as "console" | "provider") ?? "console",
      apiKey: process.env.SMS_PROVIDER_API_KEY ?? "",
    },
    email: {
      transport: (process.env.EMAIL_TRANSPORT as "console" | "smtp") ?? "console",
      from: process.env.EMAIL_FROM ?? "Smart Bible Reader <no-reply@smartbiblereader.app>",
      smtpUrl: process.env.SMTP_URL ?? "",
      smtpHost: process.env.SMTP_HOST ?? "",
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
      smtpUser: process.env.SMTP_USER ?? "",
      smtpPassword: process.env.SMTP_PASSWORD ?? "",
      smtpSecure: (process.env.SMTP_TLS ?? "true") === "true",
    },
  },
});
