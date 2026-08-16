import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";

interface ArtifactRow {
  id: string;
  type: string;
  status: string;
  project_id: string | null;
  updated_at: string;
}

const ARTIFACT_UNION = `
  SELECT id, 'module' AS type, status, project_id, updated_at FROM modules
  UNION ALL SELECT id, 'requirement', status, project_id, updated_at FROM requirements
  UNION ALL SELECT id, 'use_case', status, project_id, updated_at FROM use_cases
  UNION ALL SELECT id, 'workflow', status, project_id, updated_at FROM workflows
  UNION ALL SELECT id, 'screen', status, project_id, updated_at FROM screens
  UNION ALL SELECT id, 'entity', status, project_id, updated_at FROM entities
  UNION ALL SELECT id, 'entity_relation', status, project_id, updated_at FROM entity_relations
  UNION ALL SELECT id, 'component', status, project_id, updated_at FROM components
  UNION ALL SELECT id, 'api_endpoint', status, project_id, updated_at FROM api_endpoints
  UNION ALL SELECT id, 'sequence_diagram', status, project_id, updated_at FROM sequence_diagrams
  UNION ALL SELECT id, 'architecture_diagram', status, project_id, updated_at FROM architecture_diagrams
  UNION ALL SELECT id, 'test_case', status, project_id, updated_at FROM test_cases
  UNION ALL SELECT id, 'risk', status, project_id, updated_at FROM risks
  UNION ALL SELECT id, 'decision', status, project_id, updated_at FROM decisions
  UNION ALL SELECT id, 'milestone', status, project_id, updated_at FROM milestones
  UNION ALL SELECT id, 'task', status, project_id, updated_at FROM tasks
  UNION ALL SELECT id, 'approval', status, project_id, updated_at FROM approvals
  UNION ALL SELECT id, 'agent_run', status, project_id, updated_at FROM agent_runs
`;

function listArtifacts(db: Database, projectId?: string): ArtifactRow[] {
  if (projectId) {
    return db
      .query(`${ARTIFACT_UNION} WHERE project_id = ? ORDER BY updated_at DESC`)
      .all(projectId) as ArtifactRow[];
  }
  return db.query(`${ARTIFACT_UNION} ORDER BY updated_at DESC`).all() as ArtifactRow[];
}

export function registerArtifactRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/artifacts", async (request) => {
    const query = z
      .object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() })
      .parse(request.query);
    return { data: listArtifacts(db, query.project) };
  });
}
