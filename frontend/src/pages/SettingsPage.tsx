import { Card, CardHeader } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { API_BASE_URL } from "../shared/config";

const DOCS = [
  { path: "docs/product/PRD.md", label: "Product requirements" },
  { path: "docs/ontology/entity-catalog.md", label: "Entity catalog" },
  { path: "docs/workspace/folder-structure.md", label: "Workspace structure" },
  { path: "docs/data/database-design.md", label: "Database design" },
];

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace configuration and reference material." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Environment" />
          <dl className="space-y-2 px-5 py-4 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">API base URL</dt>
              <dd className="font-mono text-slate-700">{API_BASE_URL}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Backend</dt>
              <dd className="text-slate-700">Fastify 5 · SQLite (bun:sqlite)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Frontend</dt>
              <dd className="text-slate-700">React 18 · Vite · Tailwind · FSD</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Version</dt>
              <dd className="text-slate-700">v0.1 (foundation)</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Reference documentation" />
          <ul className="space-y-1 px-5 py-4 text-sm">
            {DOCS.map((doc) => (
              <li key={doc.path}>
                <code className="font-mono text-xs text-slate-500">{doc.path}</code>
                <span className="ml-2 text-slate-700">{doc.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
