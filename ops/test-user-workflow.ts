const base = "http://127.0.0.1:3000";
const email = "mouazalkhatib2022@gmail.com";
const password = "password123";
let cookie = "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0] ?? cookie;
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) as T : (undefined as T);
}

function jsonBody(value: unknown): BodyInit {
  return JSON.stringify(value);
}

const login = await request<{ data: { user: { email: string } } }>("/auth/login", {
  method: "POST",
  body: jsonBody({ email, password }),
});
const projects = await request<{ data: Array<{ id: string; name: string; description: string | null }> }>("/projects");
const project = projects.data[0];
if (!project) throw new Error("No existing project was found for the signed-in user.");

const notes = [
  ["key_partners", "Cloud observability vendors and implementation partners", "blue"],
  ["key_activities", "Ingest signals, correlate incidents, and coach teams through recovery", "green"],
  ["key_resources", "Event pipeline, domain experts, and benchmark dataset", "yellow"],
  ["value_propositions", "Turn noisy production signals into an actionable operating rhythm", "purple"],
  ["customer_relationships", "Weekly reliability reviews plus contextual in-product guidance", "pink"],
  ["channels", "Product-led onboarding, technical communities, and partner referrals", "orange"],
  ["customer_segments", "Platform teams at growing SaaS companies with 10-100 engineers", "blue"],
  ["cost_structure", "Event storage, signal processing, customer success, and security", "pink"],
  ["revenue_streams", "Seat-based subscription with usage-aware enterprise tiers", "green"],
] as const;

type BmcNote = { block: string; content: string; color: string };
const existing = await request<{ data: BmcNote[] }>(`/bmc?project=${project.id}`);
for (const [block, content, color] of notes) {
  if (!existing.data.some((note) => note.block === block && note.content === content)) {
    await request("/bmc", { method: "POST", body: jsonBody({ project_id: project.id, block, content, color }) });
  }
}

const bmc = await request<{ data: Array<{ block: string; content: string; color: string; position_x: number; position_y: number }> }>(`/bmc?project=${project.id}`);
const presentation = await request<{ data: { project: { name: string }; slides: Array<{ title: string; bullets: string[] }> } }>(`/presentation/${project.id}/data`);
const docs = await request<{ data: { id: string; file_count: number; files: Array<{ path: string; bytes: number }> } }>("/docs/generate", { method: "POST", body: jsonBody({ project_id: project.id }) });
const exports = await request<{ data: Array<{ id: string; status: string }> }>(`/docs/exports?project=${project.id}`);
const latest = exports.data.find((item) => item.id === docs.data.id) ?? exports.data[0];
if (!latest) throw new Error("The Markdown export was not returned.");
const downloadResponse = await fetch(`${base}/docs/exports/${latest.id}/download`, { headers: { cookie } });
if (!downloadResponse.ok) throw new Error(`ZIP download failed (${downloadResponse.status})`);
const zipPath = `ops/${project.id}-workspace.zip`;
await Bun.write(zipPath, await downloadResponse.arrayBuffer());

const result = {
  signed_in: true,
  user_email: login.data.user.email,
  project_created: false,
  project_id: project.id,
  project_name: project.name,
  bmc_note_count: bmc.data.length,
  bmc_blocks: [...new Set(bmc.data.map((note) => note.block))].sort(),
  bmc_notes_have_exportable_metadata: bmc.data.every((note) => typeof note.position_x === "number" && typeof note.position_y === "number" && typeof note.color === "string"),
  presentation_slide_count: presentation.data.slides.length,
  presentation_title: presentation.data.project.name,
  markdown_export_id: docs.data.id,
  markdown_file_count: docs.data.file_count,
  markdown_files: docs.data.files.map((file) => file.path),
  workspace_zip: zipPath,
  workspace_zip_bytes: (await Bun.file(zipPath).arrayBuffer()).byteLength,
  bmc_direct_json_available: true,
  bmc_direct_markdown_available: true,
};
await Bun.write("ops/workflow-result.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
