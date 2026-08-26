import { useEffect, useState } from "react";
import { useAdminAiProvider, useAdminAiProviderUpdate } from "../../entities/admin/api";
import { errorMessage } from "../../shared/api/client";

export function AdminAiProviderPanel() {
  const query = useAdminAiProvider();
  const update = useAdminAiProviderUpdate();
  const [form, setForm] = useState({ provider: "openai", model: "gpt-5-mini", secret_ref: "", managed_enabled: false, monthly_generations: 0, monthly_tokens: 0, max_context_tokens: 120000, max_output_tokens: 16000, hard_stop_micros: 0, privacy_notice: "Project context will be sent to the configured SpecForge-managed AI provider for draft generation." });
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setForm({ provider: query.data.provider, model: query.data.model, secret_ref: query.data.secret_ref, managed_enabled: query.data.managed_enabled === 1, monthly_generations: query.data.monthly_generations, monthly_tokens: query.data.monthly_tokens, max_context_tokens: query.data.max_context_tokens, max_output_tokens: query.data.max_output_tokens, hard_stop_micros: query.data.hard_stop_micros, privacy_notice: query.data.privacy_notice });
  }, [query.data]);

  const save = () => update.mutate(form as never, { onSuccess: () => setFeedback("SpecForge AI settings saved."), onError: (error) => setFeedback(errorMessage(error)) });
  const field = (key: keyof typeof form, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));

  return <section aria-labelledby="managed-ai-heading" className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">Managed AI control plane</p><h2 id="managed-ai-heading" className="mt-1 text-lg font-semibold text-slate-950">SpecForge AI provider</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">Configure the hidden provider route used by eligible plans. Credentials remain in deployment secret storage; this panel stores only a reference.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.managed_enabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{form.managed_enabled ? "Enabled" : "Kill switch off"}</span></div>
    {query.isError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage(query.error)}</p>}
    {feedback && <p role="status" className="mt-4 rounded-lg bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">{feedback}</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Provider<select value={form.provider} onChange={(e) => field("provider", e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Google Gemini</option></select></label>
      <label className="text-sm font-medium text-slate-700">Model<input value={form.model} onChange={(e) => field("model", e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-medium text-slate-700">Secret reference<input value={form.secret_ref} onChange={(e) => field("secret_ref", e.target.value)} placeholder="prod/specforge/openai/leona" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm" /><span className="mt-1 block text-xs text-slate-500">Reference only; never paste the provider secret here.</span></label>
      <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800"><input type="checkbox" checked={form.managed_enabled} onChange={(e) => field("managed_enabled", e.target.checked)} className="h-4 w-4 accent-indigo-600" />Enable managed generations</label>
      {([['monthly_generations','Monthly generations'],['monthly_tokens','Monthly token ceiling'],['max_context_tokens','Max context tokens'],['max_output_tokens','Max output tokens'],['hard_stop_micros','Hard stop (micro-cost units)']] as const).map(([key, label]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input type="number" min="0" value={form[key]} onChange={(e) => field(key, Number(e.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label>)}
      <label className="text-sm font-medium text-slate-700 md:col-span-2">Privacy disclosure<textarea value={form.privacy_notice} onChange={(e) => field("privacy_notice", e.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Provider changes are audit logged. The kill switch should remain off until the adapter and quota enforcement are enabled.</p><button type="button" onClick={save} disabled={update.isPending || query.isLoading} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{update.isPending ? "Saving…" : "Save AI settings"}</button></div>
  </section>;
}
