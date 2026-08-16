/**
 * Approval flow tests (Prompt 12 requirement 7).
 * Approval gates are enforced structurally: no APR, no `approved`.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { bootApp, createTestContext, request, seedProject, seedRequirement } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let projectId = "";

beforeAll(async () => {
  app = await bootApp(ctx);
  projectId = await seedProject(app);
  await seedRequirement(app, projectId);
  // An entity gives a second artifact for transition tests.
  await request(app, "POST", "/entities", { project_id: projectId, name: "user_account" });
});

afterAll(async () => {
  await app.close();
});

describe("status lifecycle registry", () => {
  it("exposes the 9 canonical statuses and approval-gated types", async () => {
    const res = await request(app, "GET", "/governance/statuses");
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.statuses).toHaveLength(9);
    for (const s of ["draft", "auto_generated", "needs_review", "approved", "ready_for_agent", "in_progress", "needs_verification", "done", "rejected"]) {
      expect(data.statuses).toContain(s);
    }
    expect(data.approval_gated_types).toContain("requirement");
    expect(data.approval_gated_types).toContain("roadmap");
    expect(data.transitions.draft).toContain("auto_generated");
  });
});

describe("approval gate (quality rule: no gate bypass)", () => {
  it("blocks needs_review -> approved without an APR", async () => {
    await request(app, "POST", "/governance/status", {
      artifact_type: "requirement",
      artifact_id: "REQ-0001",
      to_status: "needs_review",
      actor: "eng-lead@internal",
    });
    const blocked = await request(app, "POST", "/governance/status", {
      artifact_type: "requirement",
      artifact_id: "REQ-0001",
      to_status: "approved",
    });
    expect(blocked.statusCode).toBe(400);
    expect(blocked.json().error.details.code).toBe("GOV_APPROVAL_REQUIRED");
  });

  it("rejects illegal transitions with a clear message", async () => {
    const invalid = await request(app, "POST", "/governance/status", {
      artifact_type: "entity",
      artifact_id: "DB-0001",
      to_status: "done",
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error.message).toContain("Invalid transition");
    expect(invalid.json().error.message).toContain("Allowed:");
  });

  it("allows auto_generated without a gate", async () => {
    const res = await request(app, "POST", "/governance/status", {
      artifact_type: "entity",
      artifact_id: "DB-0001",
      to_status: "auto_generated",
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("approval request + decision", () => {
  let aprId = "";

  it("requests an approval as pending", async () => {
    const res = await request(app, "POST", "/approvals", {
      project_id: projectId,
      artifact_id: "REQ-0001",
      artifact_type: "requirement",
      approver_role: "product",
    });
    expect(res.statusCode).toBe(201);
    aprId = res.json().data.id;
    expect(aprId).toBe("APR-0001");
    expect(res.json().data.status).toBe("pending");
  });

  it("rejects a rejection without a reason", async () => {
    const res = await request(app, "POST", `/approvals/${aprId}/decide`, {
      decision: "rejected",
      approver_role: "product",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("reason");
  });

  it("approves and unlocks the gated transition with domain sync", async () => {
    const approve = await request(app, "POST", `/approvals/${aprId}/decide`, {
      decision: "approved",
      approver_role: "product",
      approver_name: "Ada Lovelace",
      comments: "Final requirement approved in review.",
    });
    expect(approve.statusCode).toBe(200);
    expect(approve.json().data.status).toBe("approved");

    const transition = await request(app, "POST", "/governance/status", {
      artifact_type: "requirement",
      artifact_id: "REQ-0001",
      to_status: "approved",
    });
    expect(transition.statusCode).toBe(200);
    expect(transition.json().data.approval_id).toBe(aprId);

    // Domain status column synced.
    const reqs = await request(app, "GET", `/requirements?project=${projectId}`);
    const row = reqs.json().data.find((r: { id: string }) => r.id === "REQ-0001");
    expect(row.status).toBe("approved");
  });

  it("refuses to decide an already-decided approval", async () => {
    const again = await request(app, "POST", `/approvals/${aprId}/decide`, {
      decision: "rejected",
      approver_role: "product",
      comments: "late change",
    });
    expect(again.statusCode).toBe(400);
    expect(again.json().error.message).toContain("already");
  });
});

describe("audit trail", () => {
  it("records status changes and approval decisions", async () => {
    const audit = await request(app, "GET", `/audit?project=${projectId}`);
    expect(audit.statusCode).toBe(200);
    const events = audit.json().data ?? [];
    expect(events.some((e: { action: string }) => e.action === "status_change")).toBe(true);
    expect(events.some((e: { action: string }) => e.action === "requested")).toBe(true);
    expect(events.some((e: { action: string }) => e.action === "approved")).toBe(true);
  });
});
