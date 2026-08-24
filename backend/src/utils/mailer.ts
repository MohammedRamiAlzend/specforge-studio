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
  return new SmtpMailer(smtp);
}

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Line-based reader/writer around one (plaintext or TLS) socket. */
class SmtpSession {
  private buffer = "";
  private waiter: (() => void) | null = null;

  constructor(readonly socket: net.Socket | tls.TLSSocket) {
    socket.setEncoding("utf8");
    socket.on("data", () => {
      const wake = this.waiter;
      this.waiter = null;
      wake?.();
    });
    socket.on("error", () => {
      const wake = this.waiter;
      this.waiter = null;
      wake?.();
    });
  }

  /** Resolves with one full reply (multi-line replies end with "NNN "). */
  readReply(timeoutMs = 15000): Promise<string> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const poll = (): void => {
        if (/(?:^|\r\n)\d{3}[^\r]*\r\n$/.test(this.buffer)) {
          const reply = this.buffer;
          this.buffer = "";
          resolve(reply);
          return;
        }
        if (Date.now() > deadline) {
          reject(
            new Error(`timeout waiting for SMTP reply (last bytes: ${JSON.stringify(this.buffer.slice(-120))})`),
          );
          return;
        }
        this.waiter = poll;
      };
      poll();
    });
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

function replyCode(reply: string): number {
  const match = reply.match(/(\d{3})[^\d]*$/);
  return match ? Number(match[1]) : 0;
}

function base64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function assert(reply: string, expected: number, step: string): void {
  if (replyCode(reply) !== expected) {
    throw new Error(`${step} failed (${replyCode(reply)}): ${reply.trim().slice(0, 200)}`);
  }
}

export class SmtpMailer implements Mailer {
  constructor(private readonly smtp: SmtpSettings) {}

  async send(input: MailInput): Promise<void> {
    try {
      if (this.smtp.port === 465) {
        // Implicit TLS from the first byte (Gmail's recommended port).
        const session = new SmtpSession(
          tls.connect({ host: this.smtp.host, port: 465, servername: this.smtp.host }),
        );
        await this.deliver(session, input);
        return;
      }

      // STARTTLS: plaintext greeting/EHLO, upgrade, then deliver encrypted.
      const plain = new SmtpSession(net.connect({ host: this.smtp.host, port: this.smtp.port }));
      let reply = await plain.readReply();
      assert(reply, 220, "greeting");
      await this.ehlo(plain);

      plain.write("STARTTLS");
      reply = await plain.readReply();
      assert(reply, 220, "STARTTLS");

      const secureSocket = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const upgraded = tls.connect({ socket: plain.socket, servername: this.smtp.host }, () =>
          resolve(upgraded),
        );
        upgraded.once("error", reject);
      });

      await this.deliver(new SmtpSession(secureSocket), input);
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
      ".",
    ].join("\r\n");
    return `${headers}${dotStuffed(parts)}`;
  }
}
