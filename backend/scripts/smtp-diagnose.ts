/**
 * One-shot SMTP diagnostic against the credentials in backend/.env.
 * Prints every protocol step with timings. Never prints the password.
 */
import net from "node:net";
import tls from "node:tls";

const envText = await Bun.file(new URL("../.env", import.meta.url)).text();
const env: Record<string, string> = {};
for (const line of envText.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}
const host = env.SMTP_HOST ?? "smtp.gmail.com";
const port = Number(env.SMTP_PORT ?? "465");
const user = env.SMTP_USER ?? "";
const pass = (env.SMTP_PASS ?? "").replace(/\s+/g, ""); // strip spaces like Gmail's UI shows
console.log(`host=${host} port=${port} user=${user} passLen=${pass.length}`);

const t0 = Date.now();
const log = (step: string, ok: boolean, detail = "") =>
  console.log(`${ok ? "OK  " : "FAIL"} [+${Date.now() - t0}ms] ${step}${detail ? ` :: ${detail.slice(0, 160)}` : ""}`);

let socket: tls.TLSSocket;
try {
  const dns = await new Promise<string[]>((resolve, reject) => {
    import("node:dns").then((dns) => dns.lookup(host, { all: true }, (err, addrs) => (err ? reject(err) : resolve(addrs.map((a) => a.address)))));
  });
  log("DNS", true, dns.join(", "));
} catch (e) {
  log("DNS", false, String(e));
  process.exit(1);
}

try {
  socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
    const s = tls.connect({ host, port, servername: host });
    const timer = setTimeout(() => { s.destroy(); reject(new Error("connect/handshake timeout (12s)")); }, 12000);
    s.once("secureConnect", () => { clearTimeout(timer); resolve(s); });
    s.once("error", (err) => { clearTimeout(timer); reject(err); });
  });
  log("TLS connect+handshake", true, `authorized=${socket.authorized} proto=${socket.getProtocol()}`);
} catch (e) {
  log("TLS connect+handshake", false, String(e));
  console.log("\n=> Outbound port 465 may be blocked. Try SMTP_PORT=587 in backend/.env");
  process.exit(1);
}

let buffer = "";
const readReply = (timeoutMs = 15000): Promise<string> =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString("utf8");
      if (/(?:^|\r\n)\d{3}[^\r]*\r\n$/.test(buffer)) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (err: Error): void => { cleanup(); reject(err); };
    const timer = setInterval(() => {
      if (Date.now() > deadline) { cleanup(); reject(new Error(`reply timeout; buffer=${JSON.stringify(buffer.slice(-100))}`)); }
    }, 250);
    function cleanup(): void {
      socket.off("data", onData);
      socket.off("error", onError);
      clearInterval(timer);
    }
    socket.on("data", onData);
    socket.on("error", onError);
    // If data already buffered before listeners attached:
    setImmediate(() => { /* data events fire on next tick */ });
  });

try {
  const greet = await readReply();
  log("greeting", greet.startsWith("220"), greet.trim());
  buffer = "";

  socket.write(`EHLO specforge.local\r\n`);
  const ehlo = await readReply();
  log("EHLO", ehlo.startsWith("250"), ehlo.split("\r\n").slice(0, 3).join(" | "));
  buffer = "";

  socket.write("AUTH LOGIN\r\n");
  const a1 = await readReply();
  log("AUTH LOGIN prompt", a1.startsWith("334"), a1.trim());
  buffer = "";

  socket.write(Buffer.from(user).toString("base64") + "\r\n");
  const a2 = await readReply();
  log("username accepted-prompt", a2.startsWith("334"), a2.trim());
  buffer = "";

  socket.write(Buffer.from(pass).toString("base64") + "\r\n");
  const a3 = await readReply();
  log("AUTH result (235=success)", a3.startsWith("235"), a3.trim());
  buffer = "";

  socket.write("QUIT\r\n");
  await new Promise((r) => setTimeout(r, 300));
  socket.end();
  console.log(a3.startsWith("235") ? "\n=> SMTP CREDENTIALS WORK. The problem is in app code." : "\n=> Credentials rejected. Regenerate the App Password and paste WITHOUT spaces.");
} catch (e) {
  log("conversation", false, String(e));
} finally {
  socket?.end();
}
