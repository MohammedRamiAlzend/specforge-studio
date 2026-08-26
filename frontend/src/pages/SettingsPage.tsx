import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlatformSettingsPanel } from "../features/platform-settings/PlatformSettingsPanel";
import { NodePaletteSettingsPanel } from "../features/palette-settings/NodePaletteSettingsPanel";
import { BillingPanel } from "../features/billing/BillingPanel";
import { ProviderSettingsPanel } from "../features/provider-settings/ProviderSettingsPanel";
import { PageHeader } from "../shared/ui/PageHeader";

const TABS = ["Workspace", "Providers", "Billing"] as const;
type Tab = (typeof TABS)[number];
const WORKSPACE_SECTIONS = ["Project setup", "Node palette"] as const;
type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

function normalizeTab(value: string | null): Tab {
  if (value === "Billing") return "Billing";
  if (value === "Providers") return "Providers";
  return "Workspace";
}

function normalizeWorkspaceSection(value: string | null): WorkspaceSection {
  return value === "Node palette" ? "Node palette" : "Project setup";
}

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => normalizeTab(params.get("tab")));
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>(() => normalizeWorkspaceSection(params.get("section")));

  const changeTab = (next: Tab) => {
    setTab(next);
    setParams(next === "Billing" ? { tab: "Billing" } : { tab: "Workspace", section: workspaceSection });
  };

  const changeWorkspaceSection = (next: WorkspaceSection) => {
    setWorkspaceSection(next);
    setParams({ tab: "Workspace", section: next });
  };

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        title="Settings"
        description="Manage the parts of SpecForge that affect your account and workspace."
        actions={
          <Link to="/account" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:text-slate-950 hover:shadow-md">
            Open profile <span className="ml-1.5" aria-hidden="true">→</span>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeTab(item)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-forge-500/20 ${
              tab === item
                ? "bg-slate-950 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Workspace" ? (
        <>
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-forge-700">Workspace controls</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Shape how projects are created</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">These advanced controls affect the project builder and visual modeler. They are kept together here instead of mixed with your personal account settings.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Advanced</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-1.5">
              {WORKSPACE_SECTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeWorkspaceSection(item)}
                  className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-forge-500/20 ${workspaceSection === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
          {workspaceSection === "Project setup" ? <PlatformSettingsPanel /> : null}
          {workspaceSection === "Node palette" ? <NodePaletteSettingsPanel /> : null}
        </>
      ) : null}

      {tab === "Providers" ? <ProviderSettingsPanel /> : null}

      {tab === "Billing" ? (
        <section className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-forge-700">Subscription</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Plans and invoices</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">Review your current plan, usage, renewal date, and billing history. Checkout remains clearly marked as a demo until a payment provider is explicitly approved.</p>
          </div>
          <BillingPanel />
        </section>
      ) : null}
    </div>
  );
}
