import type { ProjectTypeSelection } from "../../entities/project/types";

/** Badges for a project's platform types (with the chosen stack per type). */
export function PlatformBadges({ types }: { types?: ProjectTypeSelection[] }) {
  if (!types || types.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((type) => (
        <span
          key={type.type_id}
          className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
          style={{ borderColor: type.color ?? "#cbd5e1" }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: type.color ?? "#94a3b8" }} />
          {type.label}
          {type.stack_name ? (
            <span className="font-normal text-slate-400">· {type.stack_name}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}