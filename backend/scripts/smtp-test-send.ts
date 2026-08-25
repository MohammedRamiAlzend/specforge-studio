/** Sends one real test email using the production SmtpMailer + backend/.env. */
import { loadConfig } from "../src/config/index";
import { requireSmtpMailer } from "../src/utils/mailer";

const cfg = loadConfig();
const mailer = requireSmtpMailer(cfg);
await mailer.send({
  to: cfg.SMTP_USER as string,
  subject: "SpecForge SMTP test",
  text: "If you received this, OTP emails will work.",
  html: "<p>If you received this, <b>OTP emails will work</b>.</p>",
});
console.log("SENT OK ->", cfg.SMTP_USER);
