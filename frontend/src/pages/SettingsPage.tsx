import { useState } from "react";
import { PlatformSettingsPanel } from "../features/platform-settings/PlatformSettingsPanel";
import { Card, CardHeader } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { API_BASE_URL } from "../shared/config";

const DOCS = [
  { path: "docs/product/PRD.md", label: "Product requirements" },
  { path: "docs/ontology/entity-catalog.md", label: "Entity catalog" },
  { path: "docs/workspace/folder-structure.md", label: "Workspace structure" },
  { path: "docs/data/database-design.md", label: "Database design" },
];

const TABS = ["Platform configuration", "Environment", "Reference"] as const;

export function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Platform configuration");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace configuration, project platform types/stacks/libraries, and reference material."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Platform configuration" ? <PlatformSettingsPanel /> : null}

      {tab === "Environment" ? (
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
                <dd className="text-slate-700">v0.2 (platform configuration)</dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : null}

      {tab === "Reference" ? (
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
      ) : null}
    </div>
  );
}