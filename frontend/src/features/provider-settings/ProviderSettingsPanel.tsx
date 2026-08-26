import { useState } from "react";
import { useLeonaProviders, useRevokeLeonaProvider, useSaveLeonaProvider } from "../../entities/leona/api";
import { errorMessage } from "../../shared/api/client";

const PROVIDERS = [
  { id: "openai", name: "OpenAI", description: "Recommended first adapter for Leona Agent." },
  { id: "anthropic", name: "Anthropic", description: "Planned premium fallback adapter." },
  { id: "gemini", name: "Google Gemini", description: "Planned long-context and multimodal adapter." },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

type ConnectionStatus = "disconnected" | "connected" | "checking";

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="8" cy="15" r="3" />
      <path d="m10.6 12.4 7.9-7.9m0 0 2.5 2.5m-2.5-2.5 2-2" />
    </svg>
  );
}

export function ProviderSettingsPanel() {
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [message, setMessage] = useState("No provider connected yet.");
  const providersQuery = useLeonaProviders();
  const saveProvider = useSaveLeonaProvider();
  const revokeProvider = useRevokeLeonaProvider();
  const activeConnection = providersQuery.data?.find((item) => item.status === "active");

  const selectedProvider = PROVIDERS.find((item) => item.id === provider) ?? PROVIDERS[0];
  const canCheck = apiKey.trim().length >= 12;

  const checkConnection = () => {
    if (!canCheck) {
      setStatus("disconnected");
      setMessage("Enter a provider key with at least 12 characters to validate the connection.");
      return;
    }

    setStatus("checking");
    setMessage("Encrypting the key and saving masked connection metadata…");
    saveProvider.mutate({ provider, api_key: apiKey.trim() }, {
      onSuccess: (connection) => {
        setStatus("connected");
        setMessage(`${selectedProvider.name} is connected. Only the masked suffix •••• ${connection.key_last4} is shown.`);
        setApiKey("");
      },
      onError: (error) => {
        setStatus("disconnected");
        setMessage(errorMessage(error));
      },
    });
  };

  return (
    <section className="space-y-4" aria-labelledby="provider-settings-title">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forge-50 text-forge-700"><KeyIcon /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-forge-700">Leona Agent</p>
              <h2 id="provider-settings-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Provider settings</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Connect your own provider for BYOK usage, or review the requirements for SpecForge-managed AI.</p>
            </div>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${status === "connected" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
            {activeConnection || status === "connected" ? "Connected" : status === "checking" ? "Saving" : "Not connected"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-forge-700">Bring your own key</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Connect a provider</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">Your provider bills you directly. Keys must be submitted to a server-side vault and are never included in project exports.</p>
            </div>
            <span className="rounded-full bg-forge-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-forge-700">BYOK</span>
          </div>

          <label className="mt-6 block text-sm font-semibold text-slate-800" htmlFor="leona-provider">Provider</label>
          <select id="leona-provider" value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-forge-500 focus:ring-2 focus:ring-forge-500/15">
            {PROVIDERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">{selectedProvider.description}</p>

          <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="leona-api-key">API key</label>
          <input id="leona-api-key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your provider key" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-mono text-sm text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-forge-500 focus:ring-2 focus:ring-forge-500/15" />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">The backend encrypts the key with AES-256-GCM and returns only masked metadata. The raw key is never returned to the browser after this request.</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-xs ${status === "disconnected" && message.includes("not enabled") ? "text-amber-700" : "text-slate-500"}`} role="status">{message}</p>
            <button type="button" onClick={checkConnection} disabled={status === "checking" || saveProvider.isPending} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">{status === "checking" || saveProvider.isPending ? "Saving…" : "Save provider connection"}</button>
          </div>
        </div>

        <div className="rounded-[24px] border border-forge-200 bg-gradient-to-br from-forge-50 to-white p-5 shadow-sm sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-forge-700">SpecForge-managed AI</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Use Leona without your own key</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Premium will include managed-provider access with a monthly allowance, model limits, and transparent usage policy.</p>
          <div className="mt-5 space-y-3 rounded-2xl border border-white/80 bg-white/75 p-4">
            <div className="flex items-start gap-3"><span className="mt-0.5 text-forge-700">✓</span><p className="text-sm text-slate-700">No customer provider key required.</p></div>
            <div className="flex items-start gap-3"><span className="mt-0.5 text-forge-700">✓</span><p className="text-sm text-slate-700">Usage is counted against your plan allowance.</p></div>
            <div className="flex items-start gap-3"><span className="mt-0.5 text-forge-700">✓</span><p className="text-sm text-slate-700">Drafts remain reviewable before project writes.</p></div>
          </div>
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-950">Managed mode is not active yet</p><p className="mt-1 text-xs leading-relaxed text-amber-800">An administrator must configure the approved provider, Premium entitlement, quota policy, and production secret reference before this option can generate drafts.</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600"><span className="font-semibold text-slate-900">Security boundary:</span> provider secrets belong to encrypted backend storage, not browser storage, Markdown, JSON, ZIP, PPTX, logs, or generated project artifacts. {activeConnection ? <span className="font-medium text-slate-900">Active connection: {activeConnection.provider} •••• {activeConnection.key_last4}. <button type="button" className="font-semibold text-forge-700 underline" onClick={() => revokeProvider.mutate(activeConnection.id)} disabled={revokeProvider.isPending}>Revoke</button></span> : "No active provider connection."}</div>
    </section>
  );
}
