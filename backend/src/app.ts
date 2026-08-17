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
import { registerTeamRoutes } from "./modules/team";
import { registerIssueRoutes } from "./modules/issues";
import { registerReleaseRoutes } from "./modules/releases";
import { registerHealthRoutes } from "./modules/health";
import { registerSearchRoutes } from "./modules/search";
import { registerActivityRoutes } from "./modules/activity";

export interface BuildAppOptions {
  config?: Config;
  db?: Database;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const db = options.db ?? openDatabase(config.DATABASE_PATH);

  // Prompt 13: idempotent built-in platform configuration (project types,
  // stacks, libraries) so every database has usable defaults without any
  // manual setup step.
  seedPlatformConfiguration(db);
  // Prompt 15: idempotent built-in node palette (categories + node types) so
  // the modeler has usable defaults that can be edited from Settings.
  seedNodePalette(db);

  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  registerErrorHandler(app);

  app.get("/healthz", async () => {
    db.query("SELECT 1").get();
    return { status: "ok", db: "ok", time: new Date().toISOString() };
  });

  const deps = { db, config };
  registerProjectRoutes(app, deps);
  registerPlatformConfigRoutes(app, deps);
  registerLinkRoutes(app, deps);
  registerPaletteRoutes(app, deps);
  registerSkillRoutes(app, deps);
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
