import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_PATH: z.string().default("data/specforge.db"),
  EXPORT_DIR: z.string().default("data/exports"),
  BACKUP_STATUS_FILE: z.string().default("backups/last-backup.json"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NODE_ENV: z.string().default("development"),
  // Project APIs require a verified session by default. Tests and trusted
  // fixture tooling may explicitly opt into the legacy internal mode.
  AUTH_REQUIRED: z.preprocess(
    (value) => (value === undefined ? true : value === true || value === "true"),
    z.boolean(),
  ),
  COOKIE_SECURE: z.preprocess(
    (value) => (value === undefined ? false : value === true || value === "true"),
    z.boolean(),
  ),
  CORS_ORIGIN: z.string().url().optional(),
  AUTH_RATE_LIMIT_ENABLED: z.preprocess(
    (value) => (value === undefined ? true : value === true || value === "true"),
    z.boolean(),
  ),
  // SMTP (auth hardening): required for OTP verification and password-reset
  // emails. Gmail example: SMTP_HOST=smtp.gmail.com SMTP_PORT=465 and an
  // App Password in SMTP_PASS. Validated when the SmtpMailer is constructed.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Comma-separated exact email addresses granted global admin access at boot.
  // Empty by default: no implicit administrator is created.
  ADMIN_EMAILS: z.string().default(""),
  // Comma-separated trusted email domains allowed to create new accounts.
  // Production should use the organization domain; tests override this explicitly.
  TRUSTED_SIGNUP_DOMAINS: z.string().default("specforge.com"),
  // 32-byte hex key used only for AES-256-GCM provider credential encryption.
  LEONA_CREDENTIAL_KEY: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
});

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Returns the SMTP settings or the names of the missing variables. */
export function resolveSmtpConfig(config: Config): { smtp?: SmtpConfig; missing: string[] } {
  const entries: Array<[string, string | undefined]> = [
    ["SMTP_HOST", config.SMTP_HOST],
    ["SMTP_USER", config.SMTP_USER],
    ["SMTP_PASS", config.SMTP_PASS],
    ["SMTP_FROM", config.SMTP_FROM],
  ];
  const missing = entries.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) return { missing };
  return {
    missing,
    smtp: {
      host: config.SMTP_HOST as string,
      port: config.SMTP_PORT,
      user: config.SMTP_USER as string,
      pass: config.SMTP_PASS as string,
      from: config.SMTP_FROM as string,
    },
  };
}

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config = envSchema.parse(env);
  if (config.NODE_ENV === "production") {
    if (!config.AUTH_REQUIRED) throw new Error("AUTH_REQUIRED must remain true in production.");
    if (!config.COOKIE_SECURE) throw new Error("COOKIE_SECURE must be true in production.");
    if (!config.CORS_ORIGIN) throw new Error("CORS_ORIGIN must be configured in production.");
    if (!config.ADMIN_EMAILS.trim()) throw new Error("ADMIN_EMAILS must be configured in production.");
    if (!config.LEONA_CREDENTIAL_KEY) throw new Error("LEONA_CREDENTIAL_KEY must be configured in production.");
  }
  return config;
}
