import { describe, it, expect, beforeEach } from "bun:test";
import type { FastifyInstance } from "fastify";
import {
  bootAppWithMailer,
  createTestContext,
  registerVerifiedUser,
  FakeMailer,
  type TestContext,
} from "./helpers";

function cookieAuth(token: string) {
  return { cookie: `sf_session=${token}` };
}

let ctx: TestContext;
let app: FastifyInstance;
let mailer: FakeMailer;
let token: string;
let projectId: string;

beforeEach(async () => {
  ctx = createTestContext();
  const env = await bootAppWithMailer(ctx);
  app = env.app;
  mailer = env.mailer;
  token = await registerVerifiedUser(app, mailer, "deck@test.com");
  const res = await app.inject({
    method: "POST",
    url: "/projects",
    headers: cookieAuth(token),
    payload: { name: "Deck Project", description: "Pitch-ready.", type: "web", created_by: "deck@test.com" },
  });
  if (res.statusCode !== 201) throw new Error(`project create failed (${res.statusCode}): ${res.body}`);
  projectId = res.json().data.id;
});

describe("presentation", () => {
  it("data endpoint returns slides including title and metrics", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/presentation/${projectId}/data`,
      headers: cookieAuth(token),
    });
    expect(res.statusCode).toBe(200);
    const deck = res.json().data;
    expect(deck.project.id).toBe(projectId);
    expect(deck.slides.length).toBeGreaterThanOrEqual(8);
    expect(deck.slides[0].kind).toBe("title");
    expect(deck.slides[deck.slides.length - 1].kind).toBe("metrics");
  });

  it("pptx endpoint returns valid content type and buffer", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/presentation/${projectId}/pptx`,
      headers: cookieAuth(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("presentationml.presentation");
    expect(res.headers["content-disposition"]).toContain("pitch-deck.pptx");
    const buf = res.rawPayload;
    expect(buf.slice(0, 2).toString("utf8")).toBe("PK");
  });

  it("unknown project returns 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/presentation/PRJ-9999/data",
      headers: cookieAuth(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it("bmc notes appear in business overview slide", async () => {
    await app.inject({
      method: "POST",
      url: "/bmc",
      headers: cookieAuth(token),
      payload: { project_id: projectId, block: "value_propositions", content: "Specs that pitch themselves." },
    });
    const res = await app.inject({
      method: "GET",
      url: `/presentation/${projectId}/data`,
      headers: cookieAuth(token),
    });
    const deck = res.json().data;
    const overview = deck.slides.find((s: { kind: string }) => s.kind === "business_overview");
    expect(overview).toBeDefined();
    expect(overview.bullets.some((b: string) => b.includes("Specs that pitch themselves"))).toBe(true);
  });
});
