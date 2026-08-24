import type { Database } from "bun:sqlite";
import type { Config } from "./config/index";
import type { Mailer } from "./utils/mailer";

export interface Deps {
  db: Database;
  config: Config;
  /** Transport for transactional email (OTP verification, password reset). */
  mailer: Mailer;
}
