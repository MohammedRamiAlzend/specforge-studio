import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../../entities/search/api";
import { searchTypeLabel } from "../../entities/search/types";
import type { SearchResult } from "../../entities/search/types";
import { Spinner } from "../../shared/ui/Spinner";

export function SearchBox({ projectId }: { projectId?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: results, isFetching } = useSearch(q, projectId);

  const trimmed = q.trim();
  const showDropdown = open && trimmed.length >= 2;

  const goTo = (result: SearchResult) => {
    setQ("");
    setOpen(false);
    navigate(resultUrl(result));
  };

  return (
    <div
      className="relative"
      onFocus={() => setOpen(true)}
      onBlur={() => window.setTimeout(() => setOpen(false), 150)}
    >
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          ⌕
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500"
          placeholder={`Search ${projectId ? "this project" : "all projects"} (requirements, tasks, issues, releases…)`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Global search"
        />
        {isFetching ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Spinner className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {results && results.length > 0 ? (
            results.map((result) => (
              <button
                key={`${result.type}:${result.id}`}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goTo(result)}
              >
                <span className="w-24 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {searchTypeLabel(result.type)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{result.title}</span>
                <span className="shrink-0 font-mono text-[10px] text-slate-400">{result.id}</span>
              </button>
            ))
          ) : isFetching ? (
            <p className="px-3 py-3 text-center text-xs text-slate-400">Searching…</p>
          ) : (
            <p className="px-3 py-3 text-center text-xs text-slate-400">No matches for “{trimmed}”.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Best-effort deep link: project-scoped results open the project, projects open themselves. */
export function resultUrl(result: SearchResult): string {
  if (result.type === "project") return `/projects/${result.id}`;
  if (result.project_id) return `/projects/${result.project_id}`;
  return "/";
}
