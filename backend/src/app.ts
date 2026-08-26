import Fastify from "fastify";
import type { Database } from "bun:sqlite";
import { loadConfig, resolveSmtpConfig, type Config } from "./config/index";
import { openDatabase } from "./db/index";
import { registerErrorHandler } from "./plugins/error";
import { registerProjectRoutes } from "./modules/projects";
import { registerProjectMemberRoutes } from "./modules/project-members";
import { registerRequirementRoutes } from "./modules/requirements";
import { registerUseCaseRoutes } from "./modules/use-cases";
import { registerWorkflowRoutes } from "./modules/workflows";
import { registerEntityRoutes } from "./modules/entities";
import { registerApiEndpointRoutes } from "./modules/api-endpoints";
import { registerTaskRoutes } from "./modules/tasks";
import { registerArtifactRoutes } from "./modules/artifacts";
import { registerModelerRoutes } from "./modules/modeler";
import { registerDiagramRoutes } from "./modules/diagrams/routes";
import { registerDocsGeneratorRoutes } from "./modules/docs-generator/routes";
import { registerRoadmapRoutes } from "./modules/roadmap/routes";
import { registerAgentTaskRoutes } from "./modules/agent-tasks/routes";
import { registerGovernanceRoutes } from "./modules/governance/routes";
import { seedPlatformConfiguration } from "./modules/platform-config/seed";
import { registerPlatformConfigRoutes } from "./modules/platform-config/routes";
import { registerLinkRoutes } from "./modules/links/routes";
import { seedNodePalette } from "./modules/palette/seed";
import { registerPaletteRoutes } from "./modules/palette/routes";
import { registerSkillRoutes } from "./modules/skills";
import { registerBusinessModelRoutes } from "./modules/business-model";
import { registerPresentationRoutes } from "./modules/presentation";
import { registerSkillMatchRoutes } from "./modules/skill-match";
import { registerTeamRoutes } from "./modules/team";
import { registerIssueRoutes } from "./modules/issues";
import { registerReleaseRoutes } from "./modules/releases";
import { registerHealthRoutes } from "./modules/health";
import { registerSearchRoutes } from "./modules/search";
import { registerActivityRoutes } from "./modules/activity";
import { registerAuthRoutes, seedConfiguredAdmins } from "./modules/auth";
import { registerAuthorizationHook } from "./modules/authorization";
import { registerBillingRoutes, seedBillingPlans } from "./modules/billing";
import { registerDashboardRoutes } from "./modules/dashboard";
import { registerAdminRoutes } from "./modules/admin";
import { registerLeonaRoutes } from "./modules/leona";
import { requireSmtpMailer } from "./utils/mailer";
import type { Mailer } from "./utils/mailer";

export interface BuildAppOptions {
  config?: Config;
  db?: Database;
  /**
   * Transactional-email transport. Defaults to the real SMTP client (which
   * requires SMTP_* env config); tests and the smoke script inject fakes.
   */
  mailer?: Mailer;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const db = options.db ?? openDatabase(config.DATABASE_PATH);
  const mailer = options.mailer ?? requireSmtpMailer(config);

  // Prompt 13: idempotent built-in platform configuration (project types,
  // stacks, libraries) so every database has usable defaults without any
  // manual setup step.
  seedPlatformConfiguration(db);
  // Prompt 15: idempotent built-in node palette (categories + node types) so
  // the modeler has usable defaults that can be edited from Settings.
  seedNodePalette(db);
  // Prompt 21: idempotent built-in billing plans (free / plus / premium) for
  // the public landing pricing section and the subscribe flow.
    seedBillingPlans(db);
  seedConfiguredAdmins(db, config.ADMIN_EMAILS);

  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  registerErrorHandler(app);

  // Secure mode protects every product API by default. Public auth/plan
  // endpoints remain available; fixture tooling must explicitly set
  // AUTH_REQUIRED=false to retain the legacy trusted-internal mode.
  app.addHook("onRequest", async (request, reply) => {
    // Defense-in-depth browser protections. CSP and HSTS are deployment-aware;
    // the frontend may be served from a separate origin and local preview uses HTTP.
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    const origin = request.headers.origin;
    if (origin && config.CORS_ORIGIN && origin === config.CORS_ORIGIN) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Headers", "Content-Type");
      reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
      reply.header("Vary", "Origin");
    }
  });

  registerAuthorizationHook(app, db, config);

  // Prompt 21:frontend api() client always sets Content-Type: application/json, so
  // body-less POSTs (e.g. /auth/logout) would otherwise die with
  // FST_ERR_CTP_EMPTY_JSON_BODY BEFORE the route handler runs — silently
  // skipping cookie/session side effects. Treat an empty JSON body as {}.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body: string, done) => {
      if (body === "" || body === undefined) {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );

  app.get("/healthz", async () => {
    db.query("SELECT 1").get();
    return { status: "ok", db: "ok", time: new Date().toISOString() };
  });

  app.options("/*", async (_request, reply) => {
    reply.code(204);
    return null;
  });

  app.get("/readyz", async (_request, reply) => {
    db.query("SELECT 1").get();
    const smtp = resolveSmtpConfig(config);
    if (smtp.missing.length > 0) {
      reply.code(503);
      return { status: "not_ready", db: "ok", smtp: "missing_configuration", missing: smtp.missing };
    }
    return { status: "ready", db: "ok", smtp: "configured", time: new Date().toISOString() };
  });

  const deps = { db, config, mailer };
  registerAuthRoutes(app, deps);
  registerBillingRoutes(app, deps);
  registerProjectRoutes(app, deps);
  registerProjectMemberRoutes(app, deps);
  registerPlatformConfigRoutes(app, deps);
  registerLinkRoutes(app, deps);
  registerPaletteRoutes(app, deps);
  registerSkillRoutes(app, deps);
  registerBusinessModelRoutes(app, deps);
  registerPresentationRoutes(app, deps);
  registerSkillMatchRoutes(app, deps);
  registerRequirementRoutes(app, deps);
  registerUseCaseRoutes(app, deps);
  registerWorkflowRoutes(app, deps);
  registerEntityRoutes(app, deps);
  registerApiEndpointRoutes(app, deps);
  registerTaskRoutes(app, deps);
  registerArtifactRoutes(app, deps);
  registerModelerRoutes(app, deps);
  registerDiagramRoutes(app, deps);
  registerDocsGeneratorRoutes(app, deps);
  registerRoadmapRoutes(app, deps);
  registerAgentTaskRoutes(app, deps);
  registerGovernanceRoutes(app, deps);
  registerTeamRoutes(app, deps);
  registerIssueRoutes(app, deps);
  registerReleaseRoutes(app, deps);
  registerHealthRoutes(app, deps);
  registerSearchRoutes(app, deps);
  registerActivityRoutes(app, deps);
  registerDashboardRoutes(app, deps);
  registerAdminRoutes(app, deps);
  registerLeonaRoutes(app, deps);

  return app;
}
