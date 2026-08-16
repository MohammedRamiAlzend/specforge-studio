import { useState, type FormEvent } from "react";
import { usePlatformConfig } from "../../entities/platform-config/api";
import type { PlatformType } from "../../entities/platform-config/types";
import { useCreateProject } from "../../entities/project/api";
import type { ProjectType, ProjectTypeDraft } from "../../entities/project/types";
import { errorMessage } from "../../shared/api/client";
import { Button } from "../../shared/ui/Button";
import { ErrorState } from "../../shared/ui/States";
import { Spinner } from "../../shared/ui/Spinner";

export function CreateProjectForm({
  onCreated,
  defaultCreator = "owner@internal",
}: {
  onCreated?: () => void;
  defaultCreator?: string;
}) {
  const { data: types, isLoading, error: configError } = usePlatformConfig();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Record<string, { stack_id: string | null; library_ids: string[] }>>({});
  const [primary, setPrimary] = useState<ProjectType>("web");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateProject();

  const enabledTypes = (types ?? []).filter((t) => t.enabled);
  const enabledStacks = new Map<string, PlatformType["stacks"]>();
  for (const t of enabledTypes) {
    enabledStacks.set(t.id, t.stacks.filter((s) => s.enabled));
  }

  function toggleType(typeId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[typeId]) {
        delete next[typeId];
      } else {
        next[typeId] = { stack_id: null, library_ids: [] };
      }
      return next;
    });
  }

  function setStack(typeId: string, stackId: string | null) {
    setSelected((prev) => ({ ...prev, [typeId]: { stack_id: stackId, library_ids: [] } }));
  }

  function toggleLibrary(typeId: string, libraryId: string) {
    setSelected((prev) => {
      const current = prev[typeId];
      if (!current) return prev;
      const has = current.library_ids.includes(libraryId);
      const library_ids = has
        ? current.library_ids.filter((id) => id !== libraryId)
        : [...current.library_ids, libraryId];
      return { ...prev, [typeId]: { ...current, library_ids } };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const typeIds = Object.keys(selected);
    if (typeIds.length === 0) {
      setError("Select at least one project type.");
      return;
    }
    const typesDraft: ProjectTypeDraft[] = typeIds.map((typeId) => ({
      type_id: typeId,
      stack_id: selected[typeId]!.stack_id,
      library_ids: selected[typeId]!.library_ids.length > 0 ? selected[typeId]!.library_ids : undefined,
    }));
    try {
      await create.mutateAsync({
        name: name.trim(),
        type: primary,
        description: description.trim() || undefined,
        created_by: defaultCreator,
        types: typesDraft,
      });
      setName("");
      setDescription("");
      setSelected({});
      onCreated?.();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (configError) return <ErrorState message={configError.message} />;
  if (isLoading || !types) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="project-name" className="mb-1 block text-xs font-medium text-slate-600">
            Project name
          </label>
          <input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Atlas ordering platform"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500"
          />
        </div>
        <div>
          <label htmlFor="primary-type" className="mb-1 block text-xs font-medium text-slate-600">
            Primary type (legacy badge)
          </label>
          <select
            id="primary-type"
            value={primary}
            onChange={(e) => setPrimary(e.target.value as ProjectType)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500"
          >
            {enabledTypes.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-600">Platform types</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {enabledTypes.map((type) => {
            const isSelected = Boolean(selected[type.id]);
            return (
              <button
                type="button"
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "border-forge-500 bg-forge-50 ring-1 ring-forge-500"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: type.color ?? "#64748b" }} />
                  <span className="text-sm font-semibold text-slate-800">{type.label}</span>
                  <code className="ml-auto font-mono text-[10px] text-slate-400">{type.key}</code>
                </span>
                {type.description ? <span className="mt-0.5 block text-xs text-slate-500">{type.description}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {Object.keys(selected).length > 0 ? (
        <div className="space-y-4">
          {Object.keys(selected).map((typeId) => {
            const type = enabledTypes.find((t) => t.id === typeId)!;
            const stacks = enabledStacks.get(typeId) ?? [];
            const chosenStackId = selected[typeId]!.stack_id;
            const chosenStack = stacks.find((s) => s.id === chosenStackId) ?? null;
            return (
              <div key={typeId} className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-800">{type.label}</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Stack</label>
                    <select
                      value={chosenStackId ?? ""}
                      onChange={(e) => setStack(typeId, e.target.value || null)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500"
                    >
                      <option value="">No stack selected</option>
                      {stacks.map((stack) => (
                        <option key={stack.id} value={stack.id}>
                          {stack.name}
                          {stack.language ? ` · ${stack.language}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Libraries</label>
                    {chosenStack ? (
                      chosenStack.libraries.length === 0 ? (
                        <p className="text-xs text-slate-400">No libraries defined for {chosenStack.name}.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {chosenStack.libraries
                            .filter((lib) => lib.enabled)
                            .map((library) => {
                              const checked = selected[typeId]!.library_ids.includes(library.id);
                              return (
                                <label
                                  key={library.id}
                                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                                    checked
                                      ? "border-forge-500 bg-forge-600 text-white"
                                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleLibrary(typeId, library.id)}
                                    className="sr-only"
                                  />
                                  {library.name}
                                </label>
                              );
                            })}
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-slate-400">Choose a stack to pick its libraries.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Select at least one platform type above.</p>
      )}

      <div>
        <label htmlFor="project-description" className="mb-1 block text-xs font-medium text-slate-600">
          Description
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What is this product?"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500"
        />
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <Button type="submit" loading={create.isPending} className="w-full">
        Create project
      </Button>
    </form>
  );
}