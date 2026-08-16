/**
 * Node palette management (Prompt 15).
 *
 * Workspace-global node categories and node types stored in the database and
 * consumed by the modeler. Built-in rows can be edited or disabled but not
 * deleted. Categories referenced by node types and node types used by saved
 * model nodes cannot be deleted (backend rejects with 409). Custom node types
 * define custom fields that the inspector renders and stores in node metadata.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import {
  useCreateNodeCategory,
  useCreateNodeType,
  useDeleteNodeCategory,
  useDeleteNodeType,
  useNodePalette,
  useUpdateNodeCategory,
  useUpdateNodeType,
} from "../../entities/palette/api";
import type {
  NodeCategory,
  NodeFieldDef,
  NodeFieldType,
  NodeType,
} from "../../entities/palette/types";
import type { ModelKind } from "../../entities/model-graph/types";
import { errorMessage } from "../../shared/api/client";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ErrorState } from "../../shared/ui/States";
import { Spinner } from "../../shared/ui/Spinner";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

const MODEL_KINDS: ModelKind[] = ["workflow", "data", "architecture", "sequence"];
const FIELD_TYPES: NodeFieldType[] = ["text", "textarea", "number", "select", "boolean"];

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

function MutError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-rose-600">{message}</p>;
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

function newFieldDef(): NodeFieldDef {
  return { key: "", label: "", type: "text", options: [] };
}

// ---------------------------------------------------------------------------
// Custom field editor (used for create + edit of a node type)
// ---------------------------------------------------------------------------

function FieldDefEditor({
  fields,
  onChange,
}: {
  fields: NodeFieldDef[];
  onChange: (fields: NodeFieldDef[]) => void;
}) {
  const update = (index: number, patch: Partial<NodeFieldDef>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div key={index} className="grid gap-2 rounded-md border border-slate-200 bg-white p-2 sm:grid-cols-6">
          <Field label="Key">
            <input
              className={inputClass}
              value={field.key}
              placeholder="e.g. loop_count"
              onChange={(e) => update(index, { key: e.target.value })}
            />
          </Field>
          <Field label="Label">
            <input
              className={inputClass}
              value={field.label}
              placeholder="e.g. Loop count"
              onChange={(e) => update(index, { label: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <select
              className={inputClass}
              value={field.type}
              onChange={(e) => update(index, { type: e.target.value as NodeFieldType })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Required">
            <input
              type="checkbox"
              className="mt-2 h-4 w-4"
              checked={Boolean(field.required)}
              onChange={(e) => update(index, { required: e.target.checked })}
            />
          </Field>
          <Field label="Default">
            <input
              className={inputClass}
              value={field.default === undefined ? "" : String(field.default)}
              placeholder="optional"
              onChange={(e) => {
                if (field.type === "number") {
                  update(index, { default: e.target.value === "" ? undefined : Number(e.target.value) });
                } else if (field.type === "boolean") {
                  update(index, { default: e.target.value === "true" });
                } else {
                  update(index, { default: e.target.value === "" ? undefined : e.target.value });
                }
              }}
            />
          </Field>
          <div className="flex items-end justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange(fields.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
          {field.type === "select" ? (
            <Field label="Options (comma separated)" className="sm:col-span-6">
              <input
                className={inputClass}
                value={(field.options ?? []).join(", ")}
                placeholder="for, while, until"
                onChange={(e) =>
                  update(index, {
                    options: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          ) : null}
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...fields, newFieldDef()])}>
        + Add field
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node type management
// ---------------------------------------------------------------------------

function NodeTypeCard({
  type,
  categories,
}: {
  type: NodeType;
  categories: NodeCategory[];
}) {
  const [edit, setEdit] = useState(false);
  const [label, setLabel] = useState(type.label);
  const [color, setColor] = useState(type.color);
  const [description, setDescription] = useState(type.description ?? "");
  const [defaultTitle, setDefaultTitle] = useState(type.default_title ?? "");
  const [categoryId, setCategoryId] = useState(type.category_id);
  const [kinds, setKinds] = useState<ModelKind[]>(type.kinds);
  const [fields, setFields] = useState<NodeFieldDef[]>(type.fields ?? []);
  const [sortOrder, setSortOrder] = useState(String(type.sort_order));
  const [error, setError] = useState<string | null>(null);
  const updateType = useUpdateNodeType();
  const deleteType = useDeleteNodeType();

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await updateType.mutateAsync({
        id: type.id,
        label: label.trim(),
        color,
        description: description.trim() || null,
        default_title: defaultTitle.trim() || type.label,
        category_id: categoryId,
        kinds,
        fields: fields.filter((f) => f.key.trim() && f.label.trim()),
        sort_order: Number(sortOrder) || 0,
      });
      setEdit(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const toggleKind = (kind: ModelKind) => {
    setKinds((k) => (k.includes(kind) ? k.filter((x) => x !== kind) : [...k, kind]));
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: type.color }}
        />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-slate-800">{type.label}</span>
          <code className="ml-2 font-mono text-[10px] text-slate-400">{type.key}</code>
          {type.kinds.length ? (
            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              {type.kinds.join(", ")}
            </span>
          ) : null}
        </div>
        <BadgePill tone={type.built_in ? "emerald" : "slate"}>{type.built_in ? "built-in" : "custom"}</BadgePill>
        {!type.enabled ? <BadgePill tone="amber">disabled</BadgePill> : null}
      </div>

      {type.description ? (
        <p className="px-3 pb-2 text-xs text-slate-500">{type.description}</p>
      ) : null}
      {type.fields?.length ? (
        <p className="px-3 pb-2 text-[11px] text-slate-400">
          Custom fields: {type.fields.map((f) => `${f.label} (${f.type})`).join(", ")}
        </p>
      ) : null}

      <div className="flex items-center gap-3 border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={() => updateType.mutate({ id: type.id, enabled: type.enabled ? false : true })}
          className="text-[11px] font-medium text-forge-600 hover:underline"
        >
          {type.enabled ? "Disable" : "Enable"}
        </button>
        <button type="button" onClick={() => setEdit((v) => !v)} className="text-[11px] font-medium text-slate-500 hover:underline">
          {edit ? "Cancel" : "Edit"}
        </button>
        {!type.built_in ? (
          <button
            type="button"
            onClick={() => deleteType.mutate(type.id)}
            className="text-[11px] font-medium text-rose-600 hover:underline"
          >
            Delete
          </button>
        ) : null}
        {deleteType.isError ? (
          <span className="max-w-[280px] truncate text-[10px] text-rose-600" title={errorMessage(deleteType.error)}>
            {errorMessage(deleteType.error)}
          </span>
        ) : null}
      </div>

      {error ? <p className="px-3 pb-2 text-xs text-rose-600">{error}</p> : null}

      {edit ? (
        <form onSubmit={handleEdit} className="space-y-3 border-t border-slate-100 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Label (required)">
              <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required />
            </Field>
            <Field label="Color">
              <input className={inputClass} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
            <Field label="Sort order">
              <input className={inputClass} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Category">
              <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.key})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default title">
              <input className={inputClass} value={defaultTitle} onChange={(e) => setDefaultTitle(e.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[56px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Available graph kinds</p>
            <div className="flex flex-wrap gap-2">
              {MODEL_KINDS.map((kind) => (
                <label key={kind} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input type="checkbox" checked={kinds.includes(kind)} onChange={() => toggleKind(kind)} />
                  {kind}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">
              Custom fields (rendered in the inspector, stored in node metadata)
            </p>
            <FieldDefEditor fields={fields} onChange={setFields} />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" type="submit" loading={updateType.isPending}>
              Save type
            </Button>
            <MutError message={error} />
          </div>
        </form>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category management
// ---------------------------------------------------------------------------

function CategoryCard({ category, categories }: { category: NodeCategory; categories: NodeCategory[] }) {
  const [edit, setEdit] = useState(false);
  const [label, setLabel] = useState(category.label);
  const [color, setColor] = useState(category.color);
  const [sortOrder, setSortOrder] = useState(String(category.sort_order));
  const [showAddType, setShowAddType] = useState(false);
  const [typeKey, setTypeKey] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [typeColor, setTypeColor] = useState("#0ea5e9");
  const [typeKinds, setTypeKinds] = useState<ModelKind[]>(["workflow"]);
  const [typeFields, setTypeFields] = useState<NodeFieldDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const updateCategory = useUpdateNodeCategory();
  const deleteCategory = useDeleteNodeCategory();
  const createType = useCreateNodeType();

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        label: label.trim(),
        color,
        sort_order: Number(sortOrder) || 0,
      });
      setEdit(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleAddType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);
    try {
      await createType.mutateAsync({
        key: typeKey.trim(),
        label: typeLabel.trim(),
        category_id: category.id,
        color: typeColor,
        kinds: typeKinds,
        fields: typeFields.filter((f) => f.key.trim() && f.label.trim()),
      });
      setTypeKey("");
      setTypeLabel("");
      setTypeColor("#0ea5e9");
      setTypeKinds(["workflow"]);
      setTypeFields([]);
      setShowAddType(false);
    } catch (err) {
      setAddError(errorMessage(err));
    }
  }

  const toggleKind = (kind: ModelKind) => {
    setTypeKinds((k) => (k.includes(kind) ? k.filter((x) => x !== kind) : [...k, kind]));
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{category.label}</h4>
            <code className="font-mono text-[10px] text-slate-400">{category.key}</code>
            <BadgePill tone={category.built_in ? "emerald" : "slate"}>{category.built_in ? "built-in" : "custom"}</BadgePill>
            {!category.enabled ? <BadgePill tone="amber">disabled</BadgePill> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateCategory.mutate({ id: category.id, enabled: category.enabled ? false : true })}
          className="text-[11px] font-medium text-forge-600 hover:underline"
        >
          {category.enabled ? "Disable" : "Enable"}
        </button>
        <button type="button" onClick={() => setEdit((v) => !v)} className="text-[11px] font-medium text-slate-500 hover:underline">
          Edit
        </button>
        {!category.built_in ? (
          <button
            type="button"
            onClick={() => deleteCategory.mutate(category.id)}
            className="text-[11px] font-medium text-rose-600 hover:underline"
          >
            Delete
          </button>
        ) : null}
      </div>

      {deleteCategory.isError ? (
        <p className="px-5 py-2 text-xs text-rose-600">{errorMessage(deleteCategory.error)}</p>
      ) : null}

      {edit ? (
        <form onSubmit={handleEdit} className="grid gap-2 border-b border-slate-100 px-5 py-3 sm:grid-cols-3">
          <Field label="Label (required)">
            <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required />
          </Field>
          <Field label="Color">
            <input className={inputClass} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </Field>
          <Field label="Sort order">
            <input className={inputClass} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </Field>
          <div className="sm:col-span-3">
            <Button size="sm" type="submit" loading={updateCategory.isPending}>
              Save category
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2 px-5 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Node types ({category.nodeTypes.length})
          </p>
          <Button size="sm" variant="ghost" onClick={() => setShowAddType((v) => !v)}>
            {showAddType ? "Cancel" : "+ Add node type"}
          </Button>
        </div>

        {showAddType ? (
          <form onSubmit={handleAddType} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <Field label="Key (required)">
                <input className={inputClass} value={typeKey} onChange={(e) => setTypeKey(e.target.value)} required placeholder="e.g. loop" />
              </Field>
              <Field label="Label (required)">
                <input className={inputClass} value={typeLabel} onChange={(e) => setTypeLabel(e.target.value)} required placeholder="e.g. Loop" />
              </Field>
              <Field label="Color">
                <input className={inputClass} type="color" value={typeColor} onChange={(e) => setTypeColor(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button size="sm" type="submit" loading={createType.isPending}>
                  Create type
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Available graph kinds</p>
              <div className="flex flex-wrap gap-2">
                {MODEL_KINDS.map((kind) => (
                  <label key={kind} className="flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={typeKinds.includes(kind)}
                      onChange={() => toggleKind(kind)}
                    />
                    {kind}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Custom fields</p>
              <FieldDefEditor fields={typeFields} onChange={setTypeFields} />
            </div>
            <MutError message={addError} />
          </form>
        ) : null}

        {category.nodeTypes.length === 0 ? (
          <p className="text-xs text-slate-400">No node types in this category yet.</p>
        ) : (
          category.nodeTypes.map((type) => (
            <NodeTypeCard key={type.id} type={type} categories={categories} />
          ))
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function NodePaletteSettingsPanel() {
  const { data: palette, isLoading, error } = useNodePalette();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#64748b");
  const [addError, setAddError] = useState<string | null>(null);
  const createCategory = useCreateNodeCategory();

  async function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);
    try {
      await createCategory.mutateAsync({
        key: key.trim(),
        label: label.trim(),
        color,
      });
      setKey("");
      setLabel("");
      setColor("#64748b");
      setShowAddCategory(false);
    } catch (err) {
      setAddError(errorMessage(err));
    }
  }

  if (error) return <ErrorState message={error.message} />;
  if (isLoading || !palette) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="max-w-3xl text-xs text-slate-500">
          Node categories and node types drive the modeler palette. Disabled rows disappear from the
          palette but stay readable on saved graphs. Custom node types can define custom fields that
          the inspector shows and saves in node metadata.
        </p>
        <Button size="sm" onClick={() => setShowAddCategory((v) => !v)}>
          {showAddCategory ? "Cancel" : "+ Add category"}
        </Button>
      </div>

      {showAddCategory ? (
        <Card className="p-4">
          <form onSubmit={handleAddCategory} className="grid gap-2 sm:grid-cols-4">
            <Field label="Key (required)">
              <input className={inputClass} value={key} onChange={(e) => setKey(e.target.value)} required placeholder="e.g. compliance" />
            </Field>
            <Field label="Label (required)">
              <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="e.g. Compliance" />
            </Field>
            <Field label="Color">
              <input className={inputClass} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button size="sm" type="submit" loading={createCategory.isPending}>
                Create category
              </Button>
            </div>
            <MutError message={addError} />
          </form>
        </Card>
      ) : null}

      <div className="space-y-3">
        {palette.categories.map((category) => (
          <CategoryCard key={category.id} category={category} categories={palette.categories} />
        ))}
      </div>
    </div>
  );
}