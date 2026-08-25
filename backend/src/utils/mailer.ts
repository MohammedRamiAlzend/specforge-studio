/**
 * Zero-dependency SMTP mailer (auth hardening).
 *
 * Implements just enough of RFC 5321 to deliver mail through Gmail:
 *   * port 465 -> implicit TLS via node:tls;
 *   * other ports -> plaintext connect, EHLO, STARTTLS upgrade via
 *     tls.connect({ socket }), second EHLO;
 *   * AUTH LOGIN with base64 credentials (Gmail App Password);
 *   * MAIL FROM / RCPT TO / DATA with dot-stuffing and a multipart/alternative
 *     body so both plain-text and HTML clients render the message.
 *
 * The Mailer interface is injectable through buildApp({ mailer }) so tests
 * and the smoke script capture messages instead of hitting the network.
 */
import net from "node:net";
import tls from "node:tls";
import type { Config } from "../config/index";
import { resolveSmtpConfig } from "../config/index";

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(input: MailInput): Promise<void>;
}

export class SmtpConfigError extends Error {}

/** Validates config eagerly; lists every missing variable in the error. */
export function requireSmtpMailer(config: Config): SmtpMailer {
  const { smtp, missing } = resolveSmtpConfig(config);
  if (!smtp) {
    throw new SmtpConfigError(
      `SMTP is required for OTP/password emails. Missing environment variables: ${missing.join(", ")}. ` +
        "Set them in backend/.env — for Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, " +
        "SMTP_USER=<your gmail>, SMTP_PASS=<16-char App Password>, SMTP_FROM=<your gmail>.",
    );
  }
  // Gmail displays App Passwords grouped ("abcd efgh ijkl mnop"); spaces are
  // not part of the secret, so strip them defensively.
  return new SmtpMailer({ ...smtp, pass: smtp.pass.replace(/\s+/g, "") });
}

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Line-buffered reader/writer around one (plaintext or TLS) socket. */
export class SmtpSession {
  private buffer = "";
  private closed = false;
  private lastError: Error | null = null;

  constructor(readonly socket: net.Socket | tls.TLSSocket) {
    // Attach ALL listeners immediately so bytes that arrive during/after the
    // TLS handshake are never lost. NOTE: setEncoding() is deliberately NOT
    // used — under Bun it suppresses 'data' events on TLSSocket — so chunks
    // arrive as Buffers and are decoded here.
    socket.on("data", (chunk: Buffer | string) => {
      this.buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    });
    socket.once("close", () => {
      this.closed = true;
    });
    socket.once("error", (err: Error) => {
      this.lastError = err;
    });
    // Explicitly enter flowing mode — some runtimes keep TLSSocket paused
    // even with a 'data' listener attached pre-handshake.
    socket.resume();
  }

  /**
   * Waits for one full reply (multi-line replies end with "NNN "). A simple
   * poll loop over the accumulator is deliberately used instead of chained
   * event promises: it is race-free under any event ordering and always
   * terminates via the hard deadline.
   */
  async readReply(timeoutMs = 15000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (/(?:^|\r\n)\d{3}[^\r]*\r\n$/.test(this.buffer)) {
        const reply = this.buffer;
        this.buffer = "";
        return reply;
      }
      if (this.lastError) throw this.lastError;
      if (this.closed && !/(?:^|\r\n)\d{3}/.test(this.buffer)) {
        throw new Error("connection closed by server while awaiting reply");
      }
      if (Date.now() > deadline) {
        throw new Error(
          `timeout waiting for SMTP reply (last bytes: ${JSON.stringify(this.buffer.slice(-120))})`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  write(line: string): void {
    this.socket.write(`${line}\r\n`);
  }

  close(): void {
    try {
      this.socket.end();
    } catch {
      // socket already closed
    }
  }
}

/**
 * Extracts the status code from an SMTP reply. Per RFC 5321 every line of a
 * reply starts with the same 3-digit code ("250-..." for intermediates, the
 * final line "250 ..."); the LAST line's leading code is authoritative.
 */
function replyCode(reply: string): number {
  const lines = reply.split("\r\n").filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  return /^\d{3}/.test(last) ? Number(last.slice(0, 3)) : 0;
}

function base64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function assert(reply: string, expected: number, step: string): void {
  if (replyCode(reply) !== expected) {
    throw new Error(`${step} failed (${replyCode(reply)}): ${reply.trim().slice(0, 200)}`);
  }
}

/** Connects + completes the TLS handshake with a hard timeout. */
function connectSocket(socket: net.Socket | tls.TLSSocket, timeoutMs = 10000): Promise<void> {
  const isTls = socket instanceof tls.TLSSocket;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`connect/handshake timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    const onConnected = (): void => {
      clearTimeout(timer);
      socket.off("error", onError);
      resolve();
    };
    const onError = (err: Error): void => {
      clearTimeout(timer);
      socket.off(isTls ? "secureConnect" : "connect", onConnected);
      reject(err);
    };
    socket.once(isTls ? "secureConnect" : "connect", onConnected);
    socket.once("error", onError);
  });
}

export class SmtpMailer implements Mailer {
  constructor(private readonly smtp: SmtpSettings) {}

  async send(input: MailInput): Promise<void> {
    try {
      if (this.smtp.port === 465) {
        // Implicit TLS from the first byte (Gmail's recommended port).
        // Session is created BEFORE awaiting the handshake so its listeners
        // capture the greeting no matter when it arrives.
        const socket = tls.connect({ host: this.smtp.host, port: 465, servername: this.smtp.host });
        const session = new SmtpSession(socket);
        await connectSocket(socket);
        await this.deliver(session, input);
        return;
      }

      // STARTTLS: plaintext greeting/EHLO, upgrade, then deliver encrypted.
      const raw = net.connect({ host: this.smtp.host, port: this.smtp.port });
      const plain = new SmtpSession(raw);
      await connectSocket(raw);
      let reply = await plain.readReply();
      assert(reply, 220, "greeting");
      await this.ehlo(plain);

      plain.write("STARTTLS");
      reply = await plain.readReply();
      assert(reply, 220, "STARTTLS");

      const secureSocket = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const upgraded = tls.connect({ socket: raw, servername: this.smtp.host }, () =>
          resolve(upgraded),
        );
        upgraded.once("error", reject);
      });

      const secureSession = new SmtpSession(secureSocket);
      // The TLS layer may have already delivered the post-handshake greeting
      // into the fresh session's buffer; deliver() re-reads it safely.
      await this.deliver(secureSession, input);
    } catch (error) {
      throw new Error(
        `Email delivery failed (${this.smtp.host}:${this.smtp.port}): ${
          error instanceof Error ? error.message : String(error)
        }. Check your SMTP_* settings (Gmail requires an App Password).`,
      );
    }
  }

  private async ehlo(session: SmtpSession): Promise<void> {
    session.write("EHLO specforge.local");
    const reply = await session.readReply();
    assert(reply, 250, "EHLO");
  }

  /** Full authenticated conversation over an already-secure session. */
  private async deliver(session: SmtpSession, input: MailInput): Promise<void> {
    try {
      let reply = await session.readReply();
      assert(reply, 220, "greeting");
      await this.ehlo(session);

      session.write("AUTH LOGIN");
      reply = await session.readReply();
      assert(reply, 334, "AUTH LOGIN");

      session.write(base64(this.smtp.user));
      reply = await session.readReply();
      assert(reply, 334, "username");

      session.write(base64(this.smtp.pass));
      reply = await session.readReply();
      assert(reply, 235, "authentication");

      session.write(`MAIL FROM:<${this.smtp.from}>`);
      reply = await session.readReply();
      assert(reply, 250, "MAIL FROM");

      session.write(`RCPT TO:<${input.to}>`);
      reply = await session.readReply();
      assert(reply, 250, "RCPT TO");

      session.write("DATA");
      reply = await session.readReply();
      assert(reply, 354, "DATA");

      session.write(this.mimeMessage(input));
      reply = await session.readReply();
      assert(reply, 250, "message");

      session.write("QUIT");
      await session.readReply().catch(() => undefined);
    } finally {
      session.close();
    }
  }

  private mimeMessage(input: MailInput): string {
    const boundary = `sf-${crypto.randomUUID()}`;
    const headers = [
      `From: SpecForge Studio <${this.smtp.from}>`,
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
    ].join("\r\n");
    const dotStuffed = (body: string): string =>
      body
        .split("\r\n")
        .map((line) => (line.startsWith(".") ? `.${line}` : line))
        .join("\r\n");
    const parts = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      input.text,
      `--${boundary}`,
      'Content-Type: text/html; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      input.html,
      `--${boundary}--`,
    ].join("\r\n");
    // Dot-stuffing applies ONLY to message content. The <CRLF>.<CRLF> frame
    // terminator is protocol syntax and must remain a single unescaped dot —
    // stuffing it produces "..", which the server reads as more content and
    // keeps waiting for the real terminator forever.
    return `${headers}${dotStuffed(parts)}\r\n.\r\n`;
  }
}
