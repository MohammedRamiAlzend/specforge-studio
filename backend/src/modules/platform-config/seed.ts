/**
 * Platform configuration seeds (Prompt 13).
 *
 * Idempotent built-in defaults: the four original project types (web, mobile,
 * api, ai — matching the deprecated `projects.type` enum so existing behavior
 * is unchanged until edited), a stack set per type, and real useful libraries
 * per stack. Rows are inserted with stable fixed IDs (PTYPE-0001 … LIB-0032)
 * so seeds/scripts/tests can reference them deterministically; id_sequences is
 * advanced past the seeded ranges so newly created rows never collide.
 *
 * Built-in rows may be edited or disabled in Settings but not hard-deleted
 * (mirrors the `built_in` column and the deletion guards in routes.ts).
 */
import type { Database } from "bun:sqlite";

type SeedType = {
  id: string;
  key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
};

type SeedStack = {
  id: string;
  typeKey: string;
  name: string;
  language: string;
  description: string;
  sortOrder: number;
};

type SeedLibrary = {
  id: string;
  stackId: string;
  name: string;
  purpose: string;
  category: string;
  sortOrder: number;
};

const TYPE_SEEDS: SeedType[] = [
  { id: "PTYPE-0001", key: "web", label: "Web", description: "Web application delivered through a browser.", color: "#2563eb", icon: "globe", sortOrder: 1 },
  { id: "PTYPE-0002", key: "mobile", label: "Mobile", description: "Native or cross-platform mobile application.", color: "#7c3aed", icon: "device", sortOrder: 2 },
  { id: "PTYPE-0003", key: "api", label: "API", description: "Backend service exposing an API contract.", color: "#059669", icon: "server", sortOrder: 3 },
  { id: "PTYPE-0004", key: "ai", label: "AI", description: "AI / ML model or agent-driven service.", color: "#d97706", icon: "chip", sortOrder: 4 },
];

const STACK_SEEDS: SeedStack[] = [
  // api
  { id: "STK-0001", typeKey: "api", name: ".NET", language: "C#", description: "ASP.NET Core service stack.", sortOrder: 1 },
  { id: "STK-0002", typeKey: "api", name: "Laravel", language: "PHP", description: "PHP framework for web services.", sortOrder: 2 },
  { id: "STK-0003", typeKey: "api", name: "Node / Express", language: "Node.js", description: "Fast, minimal JavaScript API stack.", sortOrder: 3 },
  // web
  { id: "STK-0004", typeKey: "web", name: "React", language: "TypeScript", description: "Component-based single-page application.", sortOrder: 1 },
  { id: "STK-0005", typeKey: "web", name: "Next.js", language: "TypeScript", description: "React framework with routing and SSR.", sortOrder: 2 },
  { id: "STK-0006", typeKey: "web", name: "Vue", language: "JavaScript", description: "Progressive single-page application framework.", sortOrder: 3 },
  // mobile
  { id: "STK-0007", typeKey: "mobile", name: "Flutter", language: "Dart", description: "Cross-platform UI toolkit from Google.", sortOrder: 1 },
  { id: "STK-0008", typeKey: "mobile", name: "React Native", language: "TypeScript", description: "Native mobile apps from React.", sortOrder: 2 },
  { id: "STK-0009", typeKey: "mobile", name: "Swift", language: "Swift", description: "Native iOS application stack.", sortOrder: 3 },
  { id: "STK-0010", typeKey: "mobile", name: "Kotlin", language: "Kotlin", description: "Native Android application stack.", sortOrder: 4 },
  // ai
  { id: "STK-0011", typeKey: "ai", name: "Python / FastAPI", language: "Python", description: "Python service stack for AI/ML workloads.", sortOrder: 1 },
  { id: "STK-0012", typeKey: "ai", name: "Node / TypeScript", language: "TypeScript", description: "Node.js service stack for AI tooling.", sortOrder: 2 },
];

const LIBRARY_SEEDS: SeedLibrary[] = [
  // .NET
  { id: "LIB-0001", stackId: "STK-0001", name: "MailKit", purpose: "SMTP email sending.", category: "smtp", sortOrder: 1 },
  { id: "LIB-0002", stackId: "STK-0001", name: "Scalar", purpose: "Automatic interactive API documentation.", category: "api-docs", sortOrder: 2 },
  { id: "LIB-0003", stackId: "STK-0001", name: "EF Core", purpose: "Object-relational mapper for data access.", category: "orm", sortOrder: 3 },
  { id: "LIB-0004", stackId: "STK-0001", name: "Serilog", purpose: "Structured logging.", category: "logging", sortOrder: 4 },
  // Laravel
  { id: "LIB-0005", stackId: "STK-0002", name: "Laravel Sanctum", purpose: "Stateless API authentication.", category: "auth", sortOrder: 1 },
  { id: "LIB-0006", stackId: "STK-0002", name: "Swagger / OpenAPI", purpose: "API documentation and schema generation.", category: "api-docs", sortOrder: 2 },
  { id: "LIB-0007", stackId: "STK-0002", name: "Mailgun", purpose: "Transactional email delivery.", category: "smtp", sortOrder: 3 },
  // Node / Express
  { id: "LIB-0008", stackId: "STK-0003", name: "Express Validator", purpose: "Request validation middleware.", category: "validation", sortOrder: 1 },
  { id: "LIB-0009", stackId: "STK-0003", name: "Swagger UI Express", purpose: "Serve OpenAPI documentation.", category: "api-docs", sortOrder: 2 },
  { id: "LIB-0010", stackId: "STK-0003", name: "Nodemailer", purpose: "Email sending from Node.js.", category: "smtp", sortOrder: 3 },
  // React
  { id: "LIB-0011", stackId: "STK-0004", name: "React Router", purpose: "Declarative client-side routing.", category: "routing", sortOrder: 1 },
  { id: "LIB-0012", stackId: "STK-0004", name: "Zustand", purpose: "Small, fast global state store.", category: "state", sortOrder: 2 },
  { id: "LIB-0013", stackId: "STK-0004", name: "Tailwind CSS", purpose: "Utility-first styling.", category: "ui", sortOrder: 3 },
  // Next.js
  { id: "LIB-0014", stackId: "STK-0005", name: "NextAuth", purpose: "Authentication for Next.js apps.", category: "auth", sortOrder: 1 },
  { id: "LIB-0015", stackId: "STK-0005", name: "Vercel Analytics", purpose: "Web analytics for the app.", category: "analytics", sortOrder: 2 },
  // Vue
  { id: "LIB-0016", stackId: "STK-0006", name: "Pinia", purpose: "State management for Vue.", category: "state", sortOrder: 1 },
  { id: "LIB-0017", stackId: "STK-0006", name: "Vue Router", purpose: "Client-side routing for Vue.", category: "routing", sortOrder: 2 },
  { id: "LIB-0018", stackId: "STK-0006", name: "Element Plus", purpose: "Vue 3 component library.", category: "ui", sortOrder: 3 },
  // Flutter
  { id: "LIB-0019", stackId: "STK-0007", name: "Provider", purpose: "Dependency injection + state for Flutter.", category: "state", sortOrder: 1 },
  { id: "LIB-0020", stackId: "STK-0007", name: "GoRouter", purpose: "Declarative navigation for Flutter.", category: "routing", sortOrder: 2 },
  // React Native
  { id: "LIB-0021", stackId: "STK-0008", name: "React Navigation", purpose: "Navigation and routing for RN apps.", category: "routing", sortOrder: 1 },
  { id: "LIB-0022", stackId: "STK-0008", name: "AsyncStorage", purpose: "Key-value persistent storage.", category: "storage", sortOrder: 2 },
  // Swift
  { id: "LIB-0023", stackId: "STK-0009", name: "SwiftUI", purpose: "Declarative native UI framework.", category: "ui", sortOrder: 1 },
  { id: "LIB-0024", stackId: "STK-0009", name: "Alamofire", purpose: "HTTP networking for iOS.", category: "networking", sortOrder: 2 },
  // Kotlin
  { id: "LIB-0025", stackId: "STK-0010", name: "Jetpack Compose", purpose: "Modern Android UI toolkit.", category: "ui", sortOrder: 1 },
  { id: "LIB-0026", stackId: "STK-0010", name: "Retrofit", purpose: "Typed HTTP client for Android.", category: "networking", sortOrder: 2 },
  // Python / FastAPI
  { id: "LIB-0027", stackId: "STK-0011", name: "Pydantic", purpose: "Data validation and settings.", category: "validation", sortOrder: 1 },
  { id: "LIB-0028", stackId: "STK-0011", name: "OpenAPI Generator", purpose: "Generate clients/servers from OpenAPI.", category: "api-docs", sortOrder: 2 },
  { id: "LIB-0029", stackId: "STK-0011", name: "SQLAlchemy", purpose: "ORM for SQL databases.", category: "orm", sortOrder: 3 },
  // Node / TypeScript (AI)
  { id: "LIB-0030", stackId: "STK-0012", name: "Fastify", purpose: "High-performance Node.js framework.", category: "server", sortOrder: 1 },
  { id: "LIB-0031", stackId: "STK-0012", name: "LangChain.js", purpose: "LLM application orchestration.", category: "ai", sortOrder: 2 },
  { id: "LIB-0032", stackId: "STK-0012", name: "tiktoken", purpose: "Token counting for LLM prompts.", category: "ai", sortOrder: 3 },
];

/** Inserts the built-in defaults idempotently and bumps the ID counters. */
export function seedPlatformConfiguration(db: Database): void {
  const insertType = db.query(
    `INSERT OR IGNORE INTO project_types
       (id, key, label, description, color, icon, sort_order, enabled, built_in)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
  );
  for (const t of TYPE_SEEDS) {
    insertType.run(t.id, t.key, t.label, t.description, t.color, t.icon, t.sortOrder);
  }

  const insertStack = db.query(
    `INSERT OR IGNORE INTO stacks
       (id, type_id, name, language, description, sort_order, enabled, built_in)
     VALUES (?, (SELECT id FROM project_types WHERE key = ?), ?, ?, ?, ?, 1, 1)`,
  );
  for (const s of STACK_SEEDS) {
    insertStack.run(s.id, s.typeKey, s.name, s.language, s.description, s.sortOrder);
  }

  const insertLibrary = db.query(
    `INSERT OR IGNORE INTO libraries
       (id, stack_id, name, purpose, category, sort_order, enabled, built_in)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
  );
  for (const lib of LIBRARY_SEEDS) {
    insertLibrary.run(lib.id, lib.stackId, lib.name, lib.purpose, lib.category, lib.sortOrder);
  }

  // Advance id_sequences past the seeded ranges so allocateId never collides.
  const bump = (prefix: string, next: number): void => {
    db.query(
      `INSERT INTO id_sequences (prefix, next_value, project_id)
       VALUES (?, ?, NULL)
       ON CONFLICT(prefix) DO UPDATE SET
         next_value = MAX(id_sequences.next_value, excluded.next_value),
         project_id = excluded.project_id`,
    ).run(prefix, next);
  };
  bump("PTYPE", TYPE_SEEDS.length + 1);
  bump("STK", STACK_SEEDS.length + 1);
  bump("LIB", LIBRARY_SEEDS.length + 1);
}