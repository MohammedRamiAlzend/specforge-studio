import { loadConfig } from "../src/config/index";
import { openDatabase } from "../src/db/index";
import { seedAdminAccount } from "../src/modules/auth";

const config = loadConfig();
const db = openDatabase(config.DATABASE_PATH);
const email = process.env.SEED_ADMIN_EMAIL ?? "admin@specforge.com";
const password = process.env.SEED_ADMIN_PASSWORD ?? "password123";
const name = process.env.SEED_ADMIN_NAME ?? "SpecForge Administrator";

const user = await seedAdminAccount(db, email, password, name);
console.log(`Seeded global administrator ${user.email} (${user.id}). Password stored as a hash.`);
