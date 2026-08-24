import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_PATH: z.string().default("data/specforge.db"),
  EXPORT_DIR: z.string().default("data/exports"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NODE_ENV: z.string().default("development"),
  // SMTP (auth hardening): required for OTP verification and password-reset
  // emails. Gmail example: SMTP_HOST=smtp.gmail.com SMTP_PORT=465 and an
  // App Password in SMTP_PASS. Validated when the SmtpMailer is constructed.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
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
  return envSchema.parse(env);
}
