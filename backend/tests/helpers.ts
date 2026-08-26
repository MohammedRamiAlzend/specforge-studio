/**
 * Shared test helpers (Prompt 12).
 *
 * Every test file boots its own app against a fresh in-memory database, so
 * IDs restart at -0001 per file and tests are fully deterministic.
 */
import type { Database } from "bun:sqlite";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import type { Config } from "../src/config/index";
import { openDatabase } from "../src/db/index";
import type { MailInput, Mailer } from "../src/utils/mailer";

export const TEST_CONFIG: Config = {
  PORT: 0,
  HOST: "127.0.0.1",
  DATABASE_PATH: ":memory:",
  EXPORT_DIR: "data/test-exports",
  BACKUP_STATUS_FILE: "data/test-backup-status.json",
  LOG_LEVEL: "silent",
    NODE_ENV: "test",
  AUTH_REQUIRED: false,
  COOKIE_SECURE: false,
  AUTH_RATE_LIMIT_ENABLED: false,
  SMTP_HOST: "smtp.test.local",
  SMTP_PORT: 465,
  SMTP_USER: "test@specforge.local",
  SMTP_PASS: "test-password",
  SMTP_FROM: "no-reply@specforge.local",
  ADMIN_EMAILS: "",
  TRUSTED_SIGNUP_DOMAINS: "example.com,specforge.local,test.com,test.local",
};

/**
 * Records every outbound email instead of hitting the network. Tests read
 * `mailer.sent` to extract OTP codes exactly as a real inbox would.
 */
export class FakeMailer implements Mailer {
  readonly sent: MailInput[] = [];

  async send(input: MailInput): Promise<void> {
    this.sent.push(input);
  }

  /** Pulls the 6-digit code out of the most recent email's subject line. */
  lastCode(): string {
    const last = this.sent[this.sent.length - 1];
    if (!last) throw new Error("FakeMailer: no emails sent");
    const match = last.subject.match(/(\d{6})/);
    if (!match?.[1]) throw new Error(`FakeMailer: no code in subject "${last.subject}"`);
    return match[1];
  }
}

export interface TestContext {
  db: Database;
  app: FastifyInstance;
  config: Config;
}

export function createTestContext(): Omit<TestContext, "app"> {
  const config: Config = { ...TEST_CONFIG };
  const db = openDatabase(":memory:");
  return { db, config };
}

export async function bootApp(ctx: Pick<TestContext, "db" | "config">): Promise<FastifyInstance> {
  return buildApp({ config: ctx.config, db: ctx.db });
}

/** Boots an app wired to a captured FakeMailer; returns both. */
export async function bootAppWithMailer(
  ctx: Pick<TestContext, "db" | "config">,
): Promise<{ app: FastifyInstance; mailer: FakeMailer }> {
  const mailer = new FakeMailer();
  const app = await buildApp({ config: ctx.config, db: ctx.db, mailer });
  return { app, mailer };
}

/** Injects a request against the app (no server socket needed). */
export async function request(
  app: FastifyInstance,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  payload?: unknown,
): Promise<{
  statusCode: number;
  body: string;
  json: () => any;
}> {
  const res = await app.inject({
    method,
    url,
    payload: payload as undefined,
  });
  return {
    statusCode: res.statusCode,
    body: res.body,
    json: () => res.json(),
  };
}

/** Seeds a minimal project + one requirement (common base for most suites). */
export async function seedProject(app: FastifyInstance): Promise<string> {
  const res = await request(app, "POST", "/projects", {
    name: "Test app",
    type: "web",
    created_by: "tester@internal",
  });
  return res.json().data.id as string;
}

/**
 * Registers a user AND completes email verification through the fake mailer,
 * returning the session token (auth hardening: registration alone no longer
 * signs anyone in).
 */
export async function registerVerifiedUser(
  app: FastifyInstance,
  mailer: FakeMailer,
  email: string,
  password = "test-password-1",
): Promise<string> {
  const reg = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: "Test User", email, password },
  });
  if (reg.statusCode !== 201) throw new Error(`register failed: ${reg.body}`);
  const code = mailer.lastCode();
  const verify = await app.inject({
    method: "POST",
    url: "/auth/verify-email",
    payload: { email, code },
  });
  if (verify.statusCode !== 200) throw new Error(`verify failed: ${verify.body}`);
  const token = /sf_session=([^;]+)/.exec((verify.headers["set-cookie"] as string) ?? "")?.[1];
  if (!token) throw new Error("verify-email did not set a session cookie");
  return token;
}

export async function seedRequirement(
  app: FastifyInstance,
  projectId: string,
  title = "Users must be able to log in",
  extra: Record<string, unknown> = {},
): Promise<string> {
  const res = await request(app, "POST", "/requirements", {
    project_id: projectId,
    title,
    priority: "must",
    criticality: "critical",
    ...extra,
  });
  return res.json().data.id as string;
}
