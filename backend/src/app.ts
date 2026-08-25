import Fastify from "fastify";
import type { Database } from "bun:sqlite";
import { loadConfig, type Config } from "./config/index";
import { openDatabase } from "./db/index";
import { registerErrorHandler } from "./plugins/error";
import { registerProjectRoutes } from "./modules/projects";
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
import { registerSkillMatchRoutes } from "./modules/skill-match";
import { registerTeamRoutes } from "./modules/team";
import { registerIssueRoutes } from "./modules/issues";
import { registerReleaseRoutes } from "./modules/releases";
import { registerHealthRoutes } from "./modules/health";
import { registerSearchRoutes } from "./modules/search";
import { registerActivityRoutes } from "./modules/activity";
import { registerAuthRoutes } from "./modules/auth";
import { registerBillingRoutes, seedBillingPlans } from "./modules/billing";
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

  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  registerErrorHandler(app);

  // The frontend api() client always sets Content-Type: application/json, so
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

  const deps = { db, config, mailer };
  registerAuthRoutes(app, deps);
  registerBillingRoutes(app, deps);
  registerProjectRoutes(app, deps);
  registerPlatformConfigRoutes(app, deps);
  registerLinkRoutes(app, deps);
  registerPaletteRoutes(app, deps);
  registerSkillRoutes(app, deps);
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

  return app;
}
