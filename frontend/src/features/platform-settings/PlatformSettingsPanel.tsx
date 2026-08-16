/**
 * Global platform configuration management (Prompt 13).
 *
 * Workspace-global project types, stacks, and libraries, stored in the
 * database. Built-in rows can be edited or disabled but not deleted; any row
 * referenced by a project cannot be deleted (backend rejects with 409).
 */
import { useState, type FormEvent, type ReactNode } from "react";
import {
  useCreateLibrary,
  useCreateProjectType,
  useCreateStack,
  useDeleteLibrary,
  useDeleteProjectType,
  useDeleteStack,
  usePlatformConfig,
  useUpdateLibrary,
  useUpdateProjectType,
  useUpdateStack,
} from "../../entities/platform-config/api";
import type {
  PlatformLibrary,
  PlatformStack,
  PlatformType,
} from "../../entities/platform-config/types";
import { errorMessage } from "../../shared/api/client";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ErrorState } from "../../shared/ui/States";
import { Spinner } from "../../shared/ui/Spinner";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function BadgePill({ children, tone }: { children: ReactNode; tone: "slate" | "amber" | "emerald" }) {
  const tones = {
    slate: "border-slate-300 bg-slate-100 text-slate-600",
    amber: "border-amber-300 bg-amber-50 text-amber-700",
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function MutError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-rose-600">{message}</p>;
}

// ---------------------------------------------------------------------------
// Library management
// ---------------------------------------------------------------------------

function LibraryList({ stack, type }: { stack: PlatformStack; type: PlatformType }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createLibrary = useCreateLibrary();
  const updateLibrary = useUpdateLibrary();
  const deleteLibrary = useDeleteLibrary();

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await createLibrary.mutateAsync({
        stack_id: stack.id,
        name: name.trim(),
        category: category.trim() || undefined,
        purpose: purpose.trim() || undefined,
        url: url.trim() || undefined,
      });
      setName("");
      setCategory("");
      setPurpose("");
      setUrl("");
      setShowForm(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Libraries</p>
        <Button size="sm" variant="ghost" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add library"}
        </Button>
      </div>

      {showForm ? (
        <form onSubmit={handleAdd} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <Field label="Name (required)">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. MailKit" />
          </Field>
          <Field label="Category">
            <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="smtp · api-docs · auth · orm · logging" />
          </Field>
          <Field label="Purpose">
            <input className={inputClass} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What does it provide?" />
          </Field>
          <Field label="URL">
            <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button size="sm" type="submit" loading={createLibrary.isPending}>
              Add library
            </Button>
            <MutError message={error} />
          </div>
        </form>
      ) : null}

      {stack.libraries.length === 0 ? (
        <p className="text-xs text-slate-400">No libraries for this stack yet.</p>
      ) : (
        <ul className="space-y-1">
          {stack.libraries.map((library) => (
            <LibraryRow
              key={library.id}
              library={library}
              onToggle={() =>
                updateLibrary.mutate({ id: library.id, enabled: library.enabled ? false : true })
              }
              onDelete={() => deleteLibrary.mutate(library.id)}
              deleting={deleteLibrary.isPending}
              error={deleteLibrary.isError ? (deleteLibrary.error as Error).message : null}
            />
          ))}
        </ul>
      )}
      <MutError message={deleteLibrary.isError ? errorMessage(deleteLibrary.error) : null} />
    </div>
  );
}

function LibraryRow({
  library,
  onToggle,
  onDelete,
  deleting,
  error,
}: {
  library: PlatformLibrary;
  onToggle: () => void;
  onDelete: () => void;
  deleting: boolean;
  error: string | null;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${library.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
      <span className="flex-1 text-sm text-slate-700">
        {library.name}
        {library.category ? (
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
            {library.category}
          </span>
        ) : null}
        {library.purpose ? <span className="ml-2 text-xs text-slate-400">{library.purpose}</span> : null}
      </span>
      <button onClick={onToggle} className="text-[11px] font-medium text-forge-600 hover:underline" type="button">
        {library.enabled ? "Disable" : "Enable"}
      </button>
      {!library.built_in ? (
        <button onClick={onDelete} disabled={deleting} className="text-[11px] font-medium text-rose-600 hover:underline disabled:opacity-50" type="button">
          Delete
        </button>
      ) : null}
      {error ? <span className="max-w-[180px] truncate text-[10px] text-rose-600" title={error}>{error}</span> : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Stack management
// ---------------------------------------------------------------------------

function StackBlock({ stack, type }: { stack: PlatformStack; type: PlatformType }) {
  const [expanded, setExpanded] = useState(false);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(stack.name);
  const [language, setLanguage] = useState(stack.language ?? "");
  const [description, setDescription] = useState(stack.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const updateStack = useUpdateStack();
  const deleteStack = useDeleteStack();

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await updateStack.mutateAsync({
        id: stack.id,
        name: name.trim(),
        language: language.trim() || null,
        description: description.trim() || null,
      });
      setEdit(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${stack.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left text-sm font-medium text-slate-800 hover:text-forge-700"
        >
          {stack.name}
        </button>
        {stack.language ? <span className="text-xs text-slate-400">{stack.language}</span> : null}
        <BadgePill tone={stack.built_in ? "emerald" : "slate"}>{stack.built_in ? "built-in" : "custom"}</BadgePill>
        <button
          type="button"
          onClick={() => updateStack.mutate({ id: stack.id, enabled: stack.enabled ? false : true })}
          className="text-[11px] font-medium text-forge-600 hover:underline"
        >
          {stack.enabled ? "Disable" : "Enable"}
        </button>
        <button type="button" onClick={() => setEdit((v) => !v)} className="text-[11px] font-medium text-slate-500 hover:underline">
          Edit
        </button>
        {!stack.built_in ? (
          <button
            type="button"
            onClick={() => deleteStack.mutate(stack.id)}
            className="text-[11px] font-medium text-rose-600 hover:underline"
          >
            Delete
          </button>
        ) : null}
      </div>

      {error ? <p className="px-3 pb-2 text-xs text-rose-600">{error}</p> : null}
      {deleteStack.isError ? <p className="px-3 pb-2 text-xs text-rose-600">{errorMessage(deleteStack.error)}</p> : null}

      {edit ? (
        <form onSubmit={handleEdit} className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
          <Field label="Name (required)">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Language">
            <input className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Button size="sm" type="submit" loading={updateStack.isPending}>
              Save stack
            </Button>
          </div>
        </form>
      ) : null}

      {expanded ? <div className="border-t border-slate-100 p-3"><LibraryList stack={stack} type={type} /></div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type management
// ---------------------------------------------------------------------------

function TypeCard({ type }: { type: PlatformType }) {
  const [edit, setEdit] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState(type.label);
  const [color, setColor] = useState(type.color ?? "#2563eb");
  const [description, setDescription] = useState(type.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(type.sort_order));
  const [showStackForm, setShowStackForm] = useState(false);
  const [stackName, setStackName] = useState("");
  const [stackLanguage, setStackLanguage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const updateType = useUpdateProjectType();
  const deleteType = useDeleteProjectType();
  const createStack = useCreateStack();

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await updateType.mutateAsync({
        id: type.id,
        label: label.trim(),
        color,
        description: description.trim() || null,
        sort_order: Number(sortOrder) || 0,
      });
      setEdit(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleAddStack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await createStack.mutateAsync({
        type_id: type.id,
        name: stackName.trim(),
        language: stackLanguage.trim() || undefined,
      });
      setStackName("");
      setStackLanguage("");
      setShowStackForm(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color ?? "#64748b" }} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{type.label}</h4>
            <code className="font-mono text-[10px] text-slate-400">{type.key}</code>
            <BadgePill tone={type.built_in ? "emerald" : "slate"}>{type.built_in ? "built-in" : "custom"}</BadgePill>
            {!type.enabled ? <BadgePill tone="amber">disabled</BadgePill> : null}
          </div>
          {type.description ? <p className="mt-0.5 text-xs text-slate-500">{type.description}</p> : null}
        </div>
        <button type="button" onClick={() => updateType.mutate({ id: type.id, enabled: type.enabled ? false : true })} className="text-[11px] font-medium text-forge-600 hover:underline">
          {type.enabled ? "Disable" : "Enable"}
        </button>
        <button type="button" onClick={() => setEdit((v) => !v)} className="text-[11px] font-medium text-slate-500 hover:underline">
          Edit
        </button>
        {!type.built_in ? (
          <button type="button" onClick={() => deleteType.mutate(type.id)} className="text-[11px] font-medium text-rose-600 hover:underline">
            Delete
          </button>
        ) : null}
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-[11px] font-medium text-slate-500 hover:underline">
          {expanded ? "Collapse" : "Stacks"}
        </button>
      </div>

      {error ? <p className="px-5 py-2 text-xs text-rose-600">{error}</p> : null}
      {deleteType.isError ? <p className="px-5 py-2 text-xs text-rose-600">{errorMessage(deleteType.error)}</p> : null}

      {edit ? (
        <form onSubmit={handleEdit} className="grid gap-2 border-b border-slate-100 px-5 py-3 sm:grid-cols-4">
          <Field label="Label (required)">
            <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required />
          </Field>
          <Field label="Color">
            <input className={inputClass} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </Field>
          <Field label="Sort order">
            <input className={inputClass} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button size="sm" type="submit" loading={updateType.isPending}>
              Save
            </Button>
          </div>
          <Field label="Description" className="sm:col-span-4">
            <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </form>
      ) : null}

      {expanded ? (
        <div className="space-y-2 px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stacks</p>
            <Button size="sm" variant="ghost" onClick={() => setShowStackForm((v) => !v)}>
              {showStackForm ? "Cancel" : "+ Add stack"}
            </Button>
          </div>

          {showStackForm ? (
            <form onSubmit={handleAddStack} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <Field label="Name (required)">
                <input className={inputClass} value={stackName} onChange={(e) => setStackName(e.target.value)} required placeholder="e.g. Blazor" />
              </Field>
              <Field label="Language">
                <input className={inputClass} value={stackLanguage} onChange={(e) => setStackLanguage(e.target.value)} placeholder="e.g. C#" />
              </Field>
              <div className="flex items-end">
                <Button size="sm" type="submit" loading={createStack.isPending}>
                  Add stack
                </Button>
              </div>
            </form>
          ) : null}

          {type.stacks.length === 0 ? (
            <p className="text-xs text-slate-400">No stacks defined for this type.</p>
          ) : (
            type.stacks.map((stack) => <StackBlock key={stack.id} stack={stack} type={type} />)
          )}
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function PlatformSettingsPanel() {
  const { data: types, isLoading, error } = usePlatformConfig();
  const [showAddType, setShowAddType] = useState(false);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [description, setDescription] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const createType = useCreateProjectType();

  async function handleAddType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);
    try {
      await createType.mutateAsync({
        key: key.trim(),
        label: label.trim(),
        color,
        description: description.trim() || undefined,
      });
      setKey("");
      setLabel("");
      setColor("#2563eb");
      setDescription("");
      setShowAddType(false);
    } catch (err) {
      setAddError(errorMessage(err));
    }
  }

  if (error) return <ErrorState message={error.message} />;
  if (isLoading || !types) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Project types, stacks, and libraries are stored in the database and drive project creation.
          Disabled rows disappear from the creation form but stay readable on existing projects.
        </p>
        <Button size="sm" onClick={() => setShowAddType((v) => !v)}>
          {showAddType ? "Cancel" : "+ Add project type"}
        </Button>
      </div>

      {showAddType ? (
        <Card className="p-4">
          <form onSubmit={handleAddType} className="grid gap-2 sm:grid-cols-4">
            <Field label="Key (required)">
              <input className={inputClass} value={key} onChange={(e) => setKey(e.target.value)} required placeholder="e.g. desktop" />
            </Field>
            <Field label="Label (required)">
              <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="e.g. Desktop" />
            </Field>
            <Field label="Color">
              <input className={inputClass} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button size="sm" type="submit" loading={createType.isPending}>
                Create type
              </Button>
            </div>
            <Field label="Description" className="sm:col-span-4">
              <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <MutError message={addError} />
          </form>
        </Card>
      ) : null}

      <div className="space-y-3">
        {types.map((type) => (
          <TypeCard key={type.id} type={type} />
        ))}
      </div>
    </div>
  );
}
