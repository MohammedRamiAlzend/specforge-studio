import { useState, type FormEvent } from "react";
import { useCreateProject } from "../../entities/project/api";
import type { ProjectType } from "../../entities/project/types";
import { errorMessage } from "../../shared/api/client";
import { Button } from "../../shared/ui/Button";

const TYPES: ProjectType[] = ["web", "mobile", "api", "ai"];

export function CreateProjectForm({
  onCreated,
  defaultCreator = "owner@internal",
}: {
  onCreated?: () => void;
  defaultCreator?: string;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("web");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateProject();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        created_by: defaultCreator,
      });
      setName("");
      setDescription("");
      onCreated?.();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label htmlFor="project-type" className="mb-1 block text-xs font-medium text-slate-600">
          Project type
        </label>
        <select
          id="project-type"
          value={type}
          onChange={(e) => setType(e.target.value as ProjectType)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="project-description"
          className="mb-1 block text-xs font-medium text-slate-600"
        >
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
