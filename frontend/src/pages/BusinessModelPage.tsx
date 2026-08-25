import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  useBmcNotes,
  useCreateBmcNote,
  useDeleteBmcNote,
  useUpdateBmcNote,
} from "../entities/bmc/api";
import { BANDS, BLOCK_HINTS, BLOCK_LABELS, groupByBlock } from "../entities/bmc/lib";
import type { BmcBlock, BmcNote } from "../entities/bmc/types";
import { PageHeader } from "../shared/ui/PageHeader";
import { Card } from "../shared/ui/Card";
import { Button } from "../shared/ui/Button";
import { Spinner } from "../shared/ui/Spinner";
import { ErrorState } from "../shared/ui/States";

function NoteForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  submitLabel: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial ?? "");
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    if (!initial) setValue("");
  }
  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={2}
        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-forge-400 focus:outline-none"
        placeholder="Add a note…"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!value.trim()}>
          {submitLabel}
        </Button>
        <button type="button" onClick={onCancel} className="text-[11px] text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>
    </form>
  );
}

function BlockCell({
  projectId,
  block,
  notes,
}: {
  projectId: string;
  block: BmcBlock;
  notes: BmcNote[];
}) {
  const create = useCreateBmcNote(projectId);
  const update = useUpdateBmcNote(projectId);
  const remove = useDeleteBmcNote(projectId);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">{BLOCK_LABELS[block]}</h3>
        <span className="font-mono text-[10px] text-slate-300">{notes.length}</span>
      </div>
      <p className="mt-0.5 text-[11px] italic text-slate-400">{BLOCK_HINTS[block]}</p>

      <ul className="mt-3 flex-1 space-y-1.5">
        {notes.map((note) =>
          editingId === note.id ? (
            <li key={note.id}>
              <NoteForm
                initial={note.content}
                submitLabel="Save"
                onSubmit={(content) => {
                  update.mutate({ id: note.id, patch: { content } }, { onSettled: () => setEditingId(null) });
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={note.id}
              className="group flex items-start justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5"
            >
              <span className="min-w-0 text-xs leading-relaxed text-slate-700">{note.content}</span>
              <span className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label={`Edit note ${note.id}`}
                  onClick={() => setEditingId(note.id)}
                  className="text-[10px] font-medium text-slate-400 hover:text-forge-600"
                >
                  edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete note ${note.id}`}
                  onClick={() => remove.mutate(note.id)}
                  className="text-[10px] font-medium text-slate-400 hover:text-rose-500"
                >
                  del
                </button>
              </span>
            </li>
          ),
        )}
      </ul>

      {adding ? (
        <NoteForm
          submitLabel={create.isPending ? "Adding…" : "Add note"}
          onSubmit={(content) => create.mutate({ project_id: projectId, block, content })}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 w-full rounded-md border border-dashed border-slate-200 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-forge-300 hover:text-forge-500"
        >
          + Add note
        </button>
      )}
    </Card>
  );
}

/** Per-project Business Model Canvas (DEC-030 Phase A). */
export function BusinessModelPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: notes, isLoading, error } = useBmcNotes(projectId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Model"
        description="Your project on the classic nine-block canvas — structured notes that also feed the generated docs and pitch deck."
      />

      {error ? (
        <ErrorState message={error.message} />
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {BANDS.map((band, bandIndex) => (
            <div
              key={bandIndex}
              className={`grid gap-3 ${
                band.length === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : band.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
              }`}
            >
              {band.map((block) => (
                <BlockCell
                  key={block}
                  projectId={projectId ?? ""}
                  block={block}
                  notes={(projectId ? groupByBlock(notes ?? [])[block] : []) ?? []}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
