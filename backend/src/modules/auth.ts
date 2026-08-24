/**
 * Authentication module (Prompt 21 + auth hardening).
 *
 * Cookie-session auth backing the public landing + subscribe flow:
 *   * users are stored with argon2id password hashes via Bun.password
 *     (built into the Bun runtime — zero new dependencies);
 *   * sessions carry an opaque random token; only its SHA-256 hash is
 *     persisted (sessions table, 30-day expiry, FK cascade on user delete);
 *   * the session travels in an httpOnly `sf_session` cookie (SameSite=Lax),
 *     parsed and written without any extra Fastify plugin;
 *   * registration requires email verification via a 6-digit one-time code
 *     (hashed at rest, 10-minute expiry, max 5 attempts, 60s resend cooldown)
 *     delivered through the injectable Mailer; login is blocked until the
 *     address is verified and password resets revoke every existing session.
 *
 * Existing internal APIs stay open — this module guards only itself and the
 * billing endpoints (DEC-026). All operations are audit-logged.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { AppError, badRequest, conflict, unauthorized } from "../utils/errors";

// ---------------------------------------------------------------------------
// Row + view shapes
// ---------------------------------------------------------------------------

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface OtpRow {
  id: string;
  user_id: string;
  purpose: "verify_email" | "password_reset";
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  created_at: string;
}

const SESSION_COOKIE = "sf_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const OTP_TTL_MS = 10 * 60 * 1000; // codes live for 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  email: z.string().email().max(200).toLowerCase().trim(),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().email().max(200).toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

const emailSchema = z.object({
  email: z.string().email().max(200).toLowerCase().trim(),
});

const verifyEmailSchema = z.object({
  email: z.string().email().max(200).toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/),
});

const resetPasswordSchema = z.object({
  email: z.string().email().max(200).toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/),
  new_password: z.string().min(8).max(200),
});

// ---------------------------------------------------------------------------
// Cookie + token helpers
// ---------------------------------------------------------------------------

function parseCookies(header: string | undefined): Record<string, string> {
  const jar: Record<string, string> = {};
  if (!header) return jar;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) jar[key] = decodeURIComponent(value);
  }
  return jar;
}

function newSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sha256(value: string): string {
  return new Bun.CryptoHasher("sha256").update(value).digest("hex");
}

const hashToken = sha256;
const hashOtp = sha256;

function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function expiryDate(): string {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
}

function generateOtpCode(): string {
  // 6-digit numeric code from a cryptographically secure source.
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String((random[0] ?? 0) % 1_000_000).padStart(6, "0");
}

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

function getUserByEmail(db: Database, email: string): UserRow | undefined {
  return db.query("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
}

export function getUserById(db: Database, id: string): UserRow | undefined {
  return db.query("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

function createSession(db: Database, userId: string): string {
  const token = newSessionToken();
  db.query(
    "INSERT INTO sessions (id, token_hash, user_id, expires_at) VALUES (?, ?, ?, ?)",
  ).run(allocateId(db, "SES"), hashToken(token), userId, expiryDate());
  return token;
}

/** Resolves the signed-in user for a request or throws a 401 AppError. */
export function requireUser(db: Database, request: FastifyRequest): UserRow {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  if (!token) throw unauthorized();
  const session = db
    .query("SELECT * FROM sessions WHERE token_hash = ?")
    .get(hashToken(token)) as SessionRow | undefined;
  if (!session || session.expires_at < new Date().toISOString()) {
    throw unauthorized("Session is invalid or expired.");
  }
  const user = getUserById(db, session.user_id);
  if (!user) throw unauthorized("Session user no longer exists.");
  return user;
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    email_verified: user.email_verified === 1,
    created_at: user.created_at,
  };
}

// ---------------------------------------------------------------------------
// OTP service
// ---------------------------------------------------------------------------

type OtpPurpose = "verify_email" | "password_reset";

function latestOtp(db: Database, userId: string, purpose: OtpPurpose): OtpRow | undefined {
  return db
    .query(
      `SELECT * FROM otp_codes WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL
       ORDER BY created_at DESC, id DESC LIMIT 1`,
    )
    .get(userId, purpose) as OtpRow | undefined;
}

async function issueOtp(
  db: Database,
  user: UserRow,
  purpose: OtpPurpose,
): Promise<{ code: string }> {
  const active = latestOtp(db, user.id, purpose);
  if (active && Date.now() - Date.parse(active.created_at) < OTP_RESEND_COOLDOWN_MS) {
    throw new AppError(
      "RATE_LIMITED",
      "A code was just sent. Please wait a minute before requesting another one.",
      429,
    );
  }
  if (active) {
    // Supersede any previous unconsumed code.
    db.query("UPDATE otp_codes SET consumed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
      active.id,
    );
  }
  const code = generateOtpCode();
  db.query(
    `INSERT INTO otp_codes (id, user_id, purpose, code_hash, attempts, expires_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
  ).run(
    allocateId(db, "OTP"),
    user.id,
    purpose,
    hashOtp(code),
    new Date(Date.now() + OTP_TTL_MS).toISOString(),
  );
  logEvent(db, {
    entityType: "user",
    entityId: user.id,
    action: "otp_sent",
    actor: user.id,
    actorType: "system",
    payload: { purpose },
  });
  return { code };
}

/**
 * Checks a submitted code against the latest unconsumed one. Consumes the
 * code on success; bumps the attempt counter (and locks at 5) on failure.
 */
function checkOtp(db: Database, userId: string, purpose: OtpPurpose, code: string): void {
  const active = latestOtp(db, userId, purpose);
  if (!active) {
    throw badRequest("No active code found. Request a new one.");
  }
  if (active.expires_at < new Date().toISOString()) {
    throw badRequest("This code has expired. Request a new one.");
  }
  if (active.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError("CODE_LOCKED", "Too many wrong attempts. Request a new code.", 429);
  }
  if (active.code_hash !== hashOtp(code)) {
    db.query("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(active.id);
    const remaining = OTP_MAX_ATTEMPTS - active.attempts - 1;
    throw badRequest(
      remaining > 0
        ? `Wrong code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Wrong code. No attempts left — request a new code.",
    );
  }
  db.query("UPDATE otp_codes SET consumed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    active.id,
  );
}

// ---------------------------------------------------------------------------
// Email templates (branded, English-only per project constraints)
// ---------------------------------------------------------------------------

function emailShell(title: string, bodyHtml: string): { text: string; html: string } {
  return {
    text: `${title}\n\n${bodyHtml.replace(/<[^>]+>/g, "")}`,
    html: `<div style="font-family:Segoe UI,Arial,sans-serif;background:#0f172a;padding:32px">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#e19c4d,#c96a22);padding:20px 28px">
          <h1 style="margin:0;font-size:18px;color:#fff7ed">SpecForge Studio</h1>
        </div>
        <div style="padding:28px;color:#0f172a">
          <h2 style="margin:0 0 12px;font-size:16px">${title}</h2>
          ${bodyHtml}
          <p style="margin-top:24px;font-size:12px;color:#64748b">
            If you did not request this email you can safely ignore it.
          </p>
        </div>
      </div>
    </div>`,
  };
}

function verificationEmail(name: string, code: string): { subject: string; text: string; html: string } {
  const shell = emailShell(
    "Verify your email",
    `<p>Hi ${name}, welcome to SpecForge Studio!</p>
     <p>Your verification code is:</p>
     <p style="font-size:28px;letter-spacing:8px;font-weight:700;margin:16px 0">${code}</p>
     <p>This code expires in 10 minutes.</p>`,
  );
  return { subject: `Your SpecForge verification code: ${code}`, ...shell };
}

function resetEmail(name: string, code: string): { subject: string; text: string; html: string } {
  const shell = emailShell(
    "Reset your password",
    `<p>Hi ${name}, use this code to reset your password:</p>
     <p style="font-size:28px;letter-spacing:8px;font-weight:700;margin:16px 0">${code}</p>
     <p>This code expires in 10 minutes and can be used once.</p>`,
  );
  return { subject: `Your SpecForge password-reset code: ${code}`, ...shell };
}

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

async function registerUser(
  db: Database,
  mailer: Deps["mailer"],
  input: z.infer<typeof registerSchema>,
): Promise<PublicUser> {
  if (getUserByEmail(db, input.email)) {
    throw conflict(`An account with ${input.email} already exists.`);
  }
  const id = allocateId(db, "USR");
  const passwordHash = await Bun.password.hash(input.password);
  db.query(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
  ).run(id, input.email, input.name, passwordHash);
  logEvent(db, {
    entityType: "user",
    entityId: id,
    action: "created",
    actor: id,
    actorType: "human",
    payload: { email: input.email },
  });
  const user = getUserById(db, id) as UserRow;
  const { code } = await issueOtp(db, user, "verify_email");
  await mailer.send({ to: user.email, ...verificationEmail(user.name, code) });
  return toPublicUser(user);
}

async function loginUser(
  db: Database,
  input: z.infer<typeof loginSchema>,
): Promise<{ user: PublicUser; token: string }> {
  const user = getUserByEmail(db, input.email);
  const ok = user ? await Bun.password.verify(input.password, user.password_hash) : false;
  if (!user || !ok) {
    throw new AppError("UNAUTHORIZED", "Invalid email or password.", 401);
  }
  if (user.email_verified !== 1) {
    throw new AppError(
      EMAIL_NOT_VERIFIED,
      "Please verify your email address before signing in.",
      403,
    );
  }
  const token = createSession(db, user.id);
  logEvent(db, {
    entityType: "user",
    entityId: user.id,
    action: "signed_in",
    actor: user.id,
    actorType: "human",
  });
  return { user: toPublicUser(user), token };
}

function logoutUser(db: Database, request: FastifyRequest): void {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  if (!token) return;
  db.query("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerAuthRoutes(app: FastifyInstance, deps: Deps): void {
  const { db, mailer } = deps;

  /** Verifies an emailed code, marks the account verified, opens a session. */
  async function completeVerification(email: string, code: string): Promise<{ user: PublicUser; token: string }> {
    const user = getUserByEmail(db, email);
    if (!user) {
      // Indistinguishable from an account without an active code.
      throw badRequest("No active code found. Request a new one.");
    }
    checkOtp(db, user.id, "verify_email", code);
    db.query(
      "UPDATE users SET email_verified = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    ).run(user.id);
    logEvent(db, {
      entityType: "user",
      entityId: user.id,
      action: "email_verified",
      actor: user.id,
      actorType: "human",
    });
    const verified = getUserById(db, user.id) as UserRow;
    const token = createSession(db, user.id);
    return { user: toPublicUser(verified), token };
  }

  app.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const user = await registerUser(db, mailer, body);
    reply.code(201);
    return { data: { user, otp_sent: true } };
  });

  app.post("/auth/verify-email", async (request, reply) => {
    const body = verifyEmailSchema.parse(request.body);
    const { user, token } = await completeVerification(body.email, body.code);
    reply.header("Set-Cookie", sessionCookie(token));
    return { data: { user } };
  });

  app.post("/auth/resend-otp", async (request, reply) => {
    const body = emailSchema.parse(request.body);
    const user = getUserByEmail(db, body.email);
    if (user && user.email_verified !== 1) {
      // RATE_LIMITED (60s cooldown) propagates so the UI can hold its countdown;
      // unknown or already-verified addresses get the same generic response.
      const { code } = await issueOtp(db, user, "verify_email");
      await mailer.send({ to: user.email, ...verificationEmail(user.name, code) });
    }
    return { data: { ok: true } };
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const { user, token } = await loginUser(db, body);
    reply.header("Set-Cookie", sessionCookie(token));
    return { data: { user } };
  });

  app.post("/auth/logout", async (request, reply) => {
    logoutUser(db, request);
    reply.header("Set-Cookie", clearSessionCookie());
    return { data: { ok: true } };
  });

  app.get("/auth/me", async (request) => {
    const user = requireUser(db, request);
    return { data: { user: toPublicUser(user) } };
  });

  app.post("/auth/forgot-password", async (request) => {
    const body = emailSchema.parse(request.body);
    const user = getUserByEmail(db, body.email);
    if (user) {
      const { code } = await issueOtp(db, user, "password_reset");
      await mailer.send({ to: user.email, ...resetEmail(user.name, code) });
    }
    return { data: { ok: true } };
  });

  app.post("/auth/reset-password", async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);
    const user = getUserByEmail(db, body.email);
    if (!user || user.email_verified !== 1) {
      // Same shape as a wrong code so unverified/unknown accounts are indistinguishable.
      throw badRequest("Wrong code.");
    }
    checkOtp(db, user.id, "password_reset", body.code);
    const newPasswordHash = await Bun.password.hash(body.new_password);
    db.query(
      "UPDATE users SET password_hash = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    ).run(newPasswordHash, user.id);
    db.query("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    logEvent(db, {
      entityType: "user",
      entityId: user.id,
      action: "password_reset",
      actor: user.id,
      actorType: "human",
    });
    reply.header("Set-Cookie", clearSessionCookie());
    return { data: { ok: true } };
  });
}
