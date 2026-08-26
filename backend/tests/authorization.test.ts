import { describe, it, expect, beforeEach } from "bun:test";
import { bootAppWithMailer, createTestContext, registerVerifiedUser, type TestContext } from "./helpers";
import type { FastifyInstance } from "fastify";

function auth(token: string) {
  return { cookie: `sf_session=${token}` };
}

let ctx: Omit<TestContext, "app">;
let app: FastifyInstance;
let mailer: Awaited<ReturnType<typeof bootAppWithMailer>>["mailer"];

beforeEach(async () => {
  ctx = createTestContext();
  ctx.config.AUTH_REQUIRED = true;
  ctx.config.AUTH_RATE_LIMIT_ENABLED = false;
  ctx.config.CORS_ORIGIN = "https://studio.test";
  const booted = await bootAppWithMailer(ctx);
  app = booted.app;
  mailer = booted.mailer;
});

describe("secure project access", () => {
  it("exposes liveness/readiness and allows the configured CORS preflight", async () => {
    const ready = await app.inject({ method: "GET", url: "/readyz" });
    expect(ready.statusCode).toBe(200);
    expect(ready.json().status).toBe("ready");

    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/projects",
      headers: { origin: "https://studio.test", "access-control-request-method": "GET" },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe("https://studio.test");
    expect(preflight.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects anonymous access to product APIs", async () => {
    const response = await app.inject({ method: "GET", url: "/projects" });
    expect(response.statusCode).toBe(401);
  });

  it("lists and reads only projects owned by the current user", async () => {
    const firstToken = await registerVerifiedUser(app, mailer, "owner-one@test.local");
    const secondToken = await registerVerifiedUser(app, mailer, "owner-two@test.local");

    const firstCreate = await app.inject({
      method: "POST",
      url: "/projects",
      headers: auth(firstToken),
      payload: { name: "First private project", type: "web", created_by: "spoofed" },
    });
    expect(firstCreate.statusCode).toBe(201);
    const firstProjectId = firstCreate.json().data.id as string;

    const memberAdd = await app.inject({
      method: "POST",
      url: `/projects/${firstProjectId}/members`,
      headers: auth(firstToken),
      payload: { email: "owner-two@test.local", role: "viewer" },
    });
    expect(memberAdd.statusCode).toBe(201);

    const memberList = await app.inject({
      method: "GET",
      url: `/projects/${firstProjectId}/members`,
      headers: auth(firstToken),
    });
    expect(memberList.statusCode).toBe(200);
    expect(memberList.json().data).toHaveLength(2);

    const memberId = memberAdd.json().data.user_id as string;
    const memberUpdate = await app.inject({
      method: "PATCH",
      url: `/projects/${firstProjectId}/members/${memberId}`,
      headers: auth(firstToken),
      payload: { role: "editor" },
    });
    expect(memberUpdate.statusCode).toBe(200);
    expect(memberUpdate.json().data.role).toBe("editor");

    const memberDelete = await app.inject({
      method: "DELETE",
      url: `/projects/${firstProjectId}/members/${memberId}`,
      headers: auth(firstToken),
    });
    expect(memberDelete.statusCode).toBe(204);

    const secondCreate = await app.inject({
      method: "POST",
      url: "/projects",
      headers: auth(secondToken),
      payload: { name: "Second private project", type: "web", created_by: "spoofed" },
    });
    expect(secondCreate.statusCode).toBe(201);
    const secondProjectId = secondCreate.json().data.id as string;

    const firstList = await app.inject({ method: "GET", url: "/projects", headers: auth(firstToken) });
    expect(firstList.statusCode).toBe(200);
    expect(firstList.json().data.map((project: { id: string }) => project.id)).toEqual([firstProjectId]);

    const crossRead = await app.inject({
      method: "GET",
      url: `/projects/${secondProjectId}`,
      headers: auth(firstToken),
    });
    expect(crossRead.statusCode).toBe(404);
  });
});
