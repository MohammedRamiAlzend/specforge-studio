import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useCreateSkill,
  useDeleteSkill,
  useSkills,
  useUpdateSkill,
} from "../entities/skill/api";
import { LEVELS, LEVEL_COLORS, skillLevelLabel, splitSkills } from "../entities/skill/lib";
import type { Skill, SkillKind } from "../entities/skill/types";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { EmptyState } from "../shared/ui/States";
import { Spinner } from "../shared/ui/Spinner";
import { errorMessage } from "../shared/api/client";

const fieldClass =
  "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

interface SkillDraft {
  id: string | null;
  kind: SkillKind;
  name: string;
  description: string;
  level: string;
  tag: string;
  sortOrder: number;
}

const emptyDraft = (kind: SkillKind): SkillDraft => ({
  id: null,
  kind,
  name: "",
  description: "",
  level: "advanced",
  tag: "",
  sortOrder: 0,
});

function SkillForm({
  draft,
  onChange,
  onCancel,
  onSubmit,
  busy,
}: {
  draft: SkillDraft;
  onChange: (draft: SkillDraft) => void;
  onCancel?: () => void;
  onSubmit: () => void;
  busy?: boolean;
}) {
  const isEdit = draft.id !== null;
  return (
    <div className="mt-3 grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={fieldClass}
          placeholder="Skill name (e.g. Payments engineering)"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          aria-label="Skill name"
        />
        {draft.kind === "capability" ? (
          <select
            className={fieldClass}
            value={draft.level}
            onChange={(e) => onChange({ ...draft, level: e.target.value })}
            aria-label="Proficiency level"
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {skillLevelLabel(level)}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={fieldClass}
            placeholder="Tag (e.g. frontend, payments, smtp)"
            value={draft.tag}
            onChange={(e) => onChange({ ...draft, tag: e.target.value })}
            aria-label="Tech tag"
          />
        )}
      </div>
      <textarea
        className={`${fieldClass} resize-none`}
        rows={2}
        placeholder="Short description (optional)"
        value={draft.description}
        onChange={(e) => onChange({ ...draft, description: e.target.value })}
        aria-label="Skill description"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" loading={busy} disabled={draft.name.trim() === ""} onClick={onSubmit}>
          {isEdit ? "Save changes" : "Add skill"}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function SkillsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: skills, isLoading, error, refetch } = useSkills(projectId);
  const createSkill = useCreateSkill(projectId);
  const updateSkill = useUpdateSkill(projectId);
  const deleteSkill = useDeleteSkill(projectId);

  const [draft, setDraft] = useState<SkillDraft | null>(null);

  const { capability, tech } = splitSkills(skills);

  const startAdd = (kind: SkillKind) => {
    setDraft({ ...emptyDraft(kind), sortOrder: (skills?.length ?? 0) + 1 });
  };
  const startEdit = (skill: Skill) => {
    setDraft({
      id: skill.id,
      kind: skill.kind,
      name: skill.name,
      description: skill.description,
      level: skill.level ?? "advanced",
      tag: skill.tag ?? "",
      sortOrder: skill.sort_order,
    });
  };

  const submit = () => {
    if (!draft || !projectId) return;
    const input = {
      kind: draft.kind,
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      sort_order: draft.sortOrder,
      ...(draft.kind === "capability"
        ? { level: draft.level as Skill["level"] }
        : { tag: draft.tag.trim() || undefined }),
    };
    if (draft.id === null) {
      createSkill.mutate(input, { onSuccess: () => setDraft(null) });
    } else {
      updateSkill.mutate({ ...input, id: draft.id }, { onSuccess: () => setDraft(null) });
    }
  };

  const mutationError = createSkill.isError
    ? errorMessage(createSkill.error)
    : updateSkill.isError
      ? errorMessage(updateSkill.error)
      : deleteSkill.isError
        ? errorMessage(deleteSkill.error)
        : null;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Skills" description="Capabilities and technologies this project relies on." />
        <div className="text-sm text-rose-600">
          {error.message}
          <button className="ml-2 underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const renderList = (list: Skill[], kind: SkillKind, title: string, blurb: string) => (
    <Card>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{blurb}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => startAdd(kind)}>
          Add
        </Button>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {list.length === 0 ? (
          <p className="py-5 text-center text-xs text-slate-500">No {kind} skills yet.</p>
        ) : (
          list.map((skill) => (
            <div key={skill.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400">{skill.id}</span>
                  <span className="text-sm font-medium text-slate-900">{skill.name}</span>
                  {skill.kind === "capability" && skill.level ? (
                    <span
                      className={`rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize ${LEVEL_COLORS[skill.level]}`}
                    >
                      {skillLevelLabel(skill.level)}
                    </span>
                  ) : skill.tag ? (
                    <span className="rounded-full bg-forge-50 px-2 py-0.5 font-mono text-[11px] text-forge-700">
                      {skill.tag}
                    </span>
                  ) : null}
                </div>
                {skill.description ? <p className="mt-1 text-xs text-slate-500">{skill.description}</p> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => startEdit(skill)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteSkill.mutate(skill.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
        {draft && draft.id === null && draft.kind === kind ? (
          <SkillForm
            draft={draft}
            onChange={setDraft}
            onCancel={() => setDraft(null)}
            onSubmit={submit}
            busy={createSkill.isPending}
          />
        ) : null}
        {draft && draft.id !== null && draft.kind === kind ? (
          <SkillForm
            draft={draft}
            onChange={setDraft}
            onCancel={() => setDraft(null)}
            onSubmit={submit}
            busy={updateSkill.isPending}
          />
        ) : null}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        description="Capabilities and technologies this project relies on. Agents executing this project's task packs should be competent in these."
      />
      {mutationError ? <p className="text-xs text-rose-600">{mutationError}</p> : null}
      {skills === undefined || skills.length === 0 ? (
        <EmptyState
          title="No skills yet"
          hint="Add capability skills (with a proficiency level) and tech skills (with a tag) to record what this project needs."
          actionLabel="Add a capability skill"
          onAction={() => startAdd("capability")}
        />
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        {renderList(capability, "capability", "Capability skills", "Team capabilities with a proficiency level.")}
        {renderList(tech, "tech", "Tech skills", "Technologies and frameworks with a practical tag.")}
      </div>
    </div>
  );
}