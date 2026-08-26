import { Database } from "bun:sqlite";

const db = new Database("backend/data/specforge.db", { readonly: true });
console.log(JSON.stringify({
  bmcColumns: db.query("PRAGMA table_info(bmc_notes)").all(),
  latestNotes: db.query("SELECT id, project_id, block, content, position_x, position_y, color FROM bmc_notes ORDER BY created_at DESC LIMIT 5").all(),
  latestUser: db.query("SELECT id, email, email_verified, is_admin FROM users ORDER BY created_at DESC LIMIT 5").all(),
}, null, 2));
