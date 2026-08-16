import type { Database } from "bun:sqlite";
import type { Config } from "./config/index";

export interface Deps {
  db: Database;
  config: Config;
}
