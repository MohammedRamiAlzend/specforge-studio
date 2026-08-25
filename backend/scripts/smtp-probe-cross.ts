/** Cross-account delivery probe: authenticated 2013 -> recipient 2022. */
import { loadConfig } from "../src/config/index";
import { requireSmtpMailer } from "../src/utils/mailer";

const cfg = loadConfig();
const mailer = requireSmtpMailer(cfg);
await mailer.send({
  to: "mouazalkhatib2022@gmail.com",
  subject: "SpecForge delivery probe (cross-account)",
  text: "If you received this in your inbox (not spam), cross-account OTP delivery works.",
  html: "<p>If you received this in your <b>inbox</b> (not spam), cross-account OTP delivery works.</p>",
});
console.log("PROBE SENT -> mouazalkhatib2022@gmail.com");
process.exit(0);
