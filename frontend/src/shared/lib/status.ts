const STATUS_CLASSES: Record<string, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  proposed: "border-sky-200 bg-sky-50 text-sky-700",
  reviewed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  implemented: "border-teal-200 bg-teal-50 text-teal-700",
  verified: "border-cyan-200 bg-cyan-50 text-cyan-700",
  active: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  archived: "border-slate-300 bg-slate-200 text-slate-600",
  open: "border-sky-200 bg-sky-50 text-sky-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-300 bg-slate-100 text-slate-500",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  generated: "border-violet-200 bg-violet-50 text-violet-700",
  superseded: "border-slate-300 bg-slate-100 text-slate-500",
};

export function statusClass(status: string): string {
  return STATUS_CLASSES[status] ?? "border-slate-200 bg-slate-100 text-slate-700";
}
