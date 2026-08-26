import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useBmcNotes,
  useCreateBmcNote,
  useDeleteBmcNote,
  useUpdateBmcNote,
} from "../entities/bmc/api";
import { BANDS, BLOCK_HINTS, BLOCK_LABELS, BLOCK_ORDER, groupByBlock } from "../entities/bmc/lib";
import type { BmcBlock, BmcNote, BmcNoteColor } from "../entities/bmc/types";
import { businessModelJson, businessModelMarkdown } from "../entities/bmc/export";
import { PageHeader } from "../shared/ui/PageHeader";
import { Button } from "../shared/ui/Button";
import { Spinner } from "../shared/ui/Spinner";
import { ErrorState } from "../shared/ui/States";

const BOARD_WIDTH = 1260;
const BOARD_HEIGHT = 790;
const NOTE_WIDTH = 198;
const NOTE_HEIGHT = 86;
const COLORS: Array<{ id: BmcNoteColor; label: string; card: string; dot: string }> = [
  { id: "yellow", label: "Sun", card: "bg-amber-100 border-amber-200", dot: "bg-amber-300" },
  { id: "blue", label: "Sky", card: "bg-sky-100 border-sky-200", dot: "bg-sky-300" },
  { id: "green", label: "Mint", card: "bg-emerald-100 border-emerald-200", dot: "bg-emerald-300" },
  { id: "pink", label: "Rose", card: "bg-rose-100 border-rose-200", dot: "bg-rose-300" },
  { id: "purple", label: "Lavender", card: "bg-violet-100 border-violet-200", dot: "bg-violet-300" },
  { id: "orange", label: "Tangerine", card: "bg-orange-100 border-orange-200", dot: "bg-orange-300" },
];

const BLOCK_ACCENTS: Record<BmcBlock, { border: string; text: string; wash: string }> = {
  key_partners: { border: "border-emerald-300", text: "text-emerald-700", wash: "bg-emerald-50/80" },
  key_activities: { border: "border-sky-300", text: "text-sky-700", wash: "bg-sky-50/80" },
  key_resources: { border: "border-cyan-300", text: "text-cyan-700", wash: "bg-cyan-50/80" },
  value_propositions: { border: "border-forge-300", text: "text-forge-700", wash: "bg-forge-50/80" },
  customer_relationships: { border: "border-violet-300", text: "text-violet-700", wash: "bg-violet-50/80" },
  channels: { border: "border-amber-300", text: "text-amber-700", wash: "bg-amber-50/80" },
  customer_segments: { border: "border-indigo-300", text: "text-indigo-700", wash: "bg-indigo-50/80" },
  cost_structure: { border: "border-rose-300", text: "text-rose-700", wash: "bg-rose-50/80" },
  revenue_streams: { border: "border-emerald-400", text: "text-emerald-800", wash: "bg-emerald-50/80" },
};

type Position = { x: number; y: number };

function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function blockLayout(block: BmcBlock): { x: number; y: number; width: number; height: number } {
  const top = BANDS[0]?.indexOf(block) ?? -1;
  if (top >= 0) return { x: 18 + top * 306, y: 20, width: 288, height: 336 };
  const middle = BANDS[1]?.indexOf(block) ?? -1;
  if (middle >= 0) return { x: 18 + middle * 408, y: 374, width: 390, height: 190 };
  const bottom = BANDS[2]?.indexOf(block) ?? 0;
  return { x: 18 + bottom * 612, y: 582, width: 594, height: 184 };
}

function fallbackPosition(note: BmcNote, index: number): Position {
  const layout = blockLayout(note.block);
  return { x: layout.x + 14 + (index % 2) * 132, y: layout.y + 82 + Math.floor(index / 2) * 100 };
}

function notePosition(note: BmcNote, index: number): Position {
  if (typeof note.position_x !== "number" || typeof note.position_y !== "number" || (note.position_x === 24 && note.position_y === 96)) {
    return fallbackPosition(note, index);
  }
  return { x: note.position_x, y: note.position_y };
}

function noteColor(color: BmcNoteColor | undefined) {
  return COLORS.find((item) => item.id === color) ?? COLORS[0]!;
}

function NoteEditor({
  note,
  onSave,
  onCancel,
}: {
  note?: BmcNote;
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(note?.content ?? "");
  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        const content = value.trim();
        if (content) onSave(content);
      }}
      className="space-y-2"
    >
      <textarea
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Write an insight, assumption, or decision…"
        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-forge-200 transition focus:ring-2"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!value.trim()}>{note ? "Save note" : "Add sticky"}</Button>
        <button type="button" onClick={onCancel} className="text-xs font-medium text-slate-400 hover:text-slate-700">Cancel</button>
      </div>
    </form>
  );
}

function CanvasNote({
  note,
  position,
  selected,
  onSelect,
  onDragStart,
  onEdit,
  onDelete,
}: {
  note: BmcNote;
  position: Position;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = noteColor(note.color);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${BLOCK_LABELS[note.block]} sticky note: ${note.content}`}
      onPointerDown={onDragStart}
      onClick={onSelect}
      onDoubleClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter") onEdit();
      }}
      className={`group absolute flex cursor-grab flex-col rounded-xl border p-3 text-left shadow-sm transition-shadow hover:z-30 hover:shadow-lg active:cursor-grabbing ${color.card} ${selected ? "z-20 ring-2 ring-forge-500 ring-offset-2" : "z-10"}`}
      style={{ left: position.x, top: position.y, width: NOTE_WIDTH, minHeight: NOTE_HEIGHT }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
          <span className={`h-2 w-2 rounded-full ${color.dot}`} />{BLOCK_LABELS[note.block]}
        </span>
        <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" aria-label={`Edit ${note.id}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onEdit(); }} className="rounded px-1 text-[10px] font-semibold text-slate-500 hover:bg-white/60 hover:text-forge-700">edit</button>
          <button type="button" aria-label={`Delete ${note.id}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onDelete(); }} className="rounded px-1 text-[10px] font-semibold text-slate-500 hover:bg-white/60 hover:text-rose-700">×</button>
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs font-medium leading-relaxed text-slate-700">{note.content}</p>
      <span className="mt-auto pt-2 text-[9px] font-mono text-slate-400">{note.id}</span>
    </div>
  );
}

function BlockFrame({ block }: { block: BmcBlock }) {
  const layout = blockLayout(block);
  const accent = BLOCK_ACCENTS[block];
  return (
    <div
      className={`absolute rounded-2xl border-2 border-dashed ${accent.border} ${accent.wash} p-4`}
      style={{ left: layout.x, top: layout.y, width: layout.width, height: layout.height }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${accent.text}`}>{BLOCK_LABELS[block]}</p>
          <p className="mt-1 max-w-[210px] text-[10px] leading-relaxed text-slate-400">{BLOCK_HINTS[block]}</p>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[9px] font-semibold text-slate-400">{BLOCK_ORDER.indexOf(block) + 1}/9</span>
      </div>
    </div>
  );
}

export function BusinessModelPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: notes, isLoading, error } = useBmcNotes(projectId);
  const create = useCreateBmcNote(projectId ?? "");
  const update = useUpdateBmcNote(projectId ?? "");
  const remove = useDeleteBmcNote(projectId ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newBlock, setNewBlock] = useState<BmcBlock>("value_propositions");
  const [newColor, setNewColor] = useState<BmcNoteColor>("yellow");
  const [filter, setFilter] = useState<BmcBlock | "all">("all");
  const [zoom, setZoom] = useState(0.82);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const dragRef = useRef<{ id: string; startX: number; startY: number; origin: Position } | null>(null);
  const grouped = useMemo(() => groupByBlock(notes ?? []), [notes]);
  const selected = notes?.find((note) => note.id === selectedId);
  const visibleNotes = (notes ?? []).filter((note) => filter === "all" || note.block === filter);

  useEffect(() => {
    const next: Record<string, Position> = {};
    for (const [block, blockNotes] of Object.entries(grouped) as Array<[BmcBlock, BmcNote[]]>) {
      blockNotes.forEach((note, index) => {
        next[note.id] = positions[note.id] ?? notePosition(note, index);
        if (!note.color) note.color = "yellow";
        void block;
      });
    }
    setPositions((current) => ({ ...next, ...current }));
    // We only seed local positions when fresh query data arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const next = {
        x: Math.max(8, Math.min(BOARD_WIDTH - NOTE_WIDTH - 8, drag.origin.x + (event.clientX - drag.startX) / zoom)),
        y: Math.max(8, Math.min(BOARD_HEIGHT - NOTE_HEIGHT - 8, drag.origin.y + (event.clientY - drag.startY) / zoom)),
      };
      setPositions((current) => ({ ...current, [drag.id]: next }));
    }
    function onPointerUp() {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      const position = positions[drag.id];
      if (position) update.mutate({ id: drag.id, patch: { position_x: position.x, position_y: position.y } });
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [positions, update, zoom]);

  function startDrag(note: BmcNote, event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    const origin = positions[note.id] ?? { x: 24, y: 96 };
    setSelectedId(note.id);
    dragRef.current = { id: note.id, startX: event.clientX, startY: event.clientY, origin };
  }

  function addNote(content: string) {
    if (!projectId) return;
    const layout = blockLayout(newBlock);
    const nextIndex = grouped[newBlock].length;
    create.mutate(
      { project_id: projectId, block: newBlock, content, color: newColor, position_x: layout.x + 14 + (nextIndex % 2) * 132, position_y: layout.y + 82 + Math.floor(nextIndex / 2) * 100 },
      { onSuccess: (note) => { setAdding(false); setSelectedId(note.id); } },
    );
  }

  const updateColor = (color: BmcNoteColor) => {
    if (selected) update.mutate({ id: selected.id, patch: { color } });
  };

  if (isLoading) return <div className="flex min-h-[500px] flex-col items-center justify-center gap-2 text-slate-400"><p className="text-sm font-semibold text-slate-700">Business Model Canvas</p><div className="flex items-center gap-2"><Spinner /> Loading canvas…</div></div>;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business Model Canvas"
        description="Think together on an infinite-feeling board. Drop assumptions into the nine blocks, move them into shape, and keep every decision connected to your project."
        actions={projectId ? <Link to={`/projects/${projectId}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-forge-300 hover:text-forge-700">Back to project →</Link> : null}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white" aria-hidden="true">✦</span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Strategy board</p>
              <p className="text-[11px] text-slate-500">Drag sticky notes, double-click to edit, and use the wheel or zoom controls to navigate.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filter} onChange={(event) => setFilter(event.target.value as BmcBlock | "all")} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 outline-none focus:border-forge-400">
              <option value="all">All blocks</option>
              {BLOCK_ORDER.map((block) => <option key={block} value={block}>{BLOCK_LABELS[block]}</option>)}
            </select>
            <button type="button" onClick={() => setZoom((value) => Math.max(0.58, Number((value - 0.1).toFixed(2))))} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-600 hover:border-forge-300">−</button>
            <span className="min-w-12 text-center font-mono text-[11px] text-slate-500">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(1.15, Number((value + 0.1).toFixed(2))))} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-600 hover:border-forge-300">+</button>
            <button type="button" onClick={() => setZoom(0.82)} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:border-forge-300">Fit board</button>
            <button type="button" onClick={() => downloadTextFile(`${projectId}-business-model.md`, businessModelMarkdown(notes ?? [], projectId ?? ""), "text/markdown;charset=utf-8")} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-forge-300 hover:text-forge-700">Export MD</button>
            <button type="button" onClick={() => downloadTextFile(`${projectId}-business-model.json`, businessModelJson(notes ?? [], projectId ?? ""), "application/json;charset=utf-8")} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-forge-300 hover:text-forge-700">Export JSON</button>
            <Button size="sm" onClick={() => setAdding(true)}>+ Add note</Button>
          </div>
        </div>

        <div className="relative overflow-auto bg-[#f6f8fb] p-4 sm:p-6">
          <div className="relative min-h-[500px]" style={{ width: BOARD_WIDTH * zoom, height: BOARD_HEIGHT * zoom }}>
            <div className="absolute left-0 top-0 origin-top-left rounded-2xl border border-slate-200 bg-white/80 shadow-inner" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `scale(${zoom})`, backgroundImage: "radial-gradient(#cbd5e1 0.7px, transparent 0.7px)", backgroundSize: "18px 18px" }}>
              <div className="pointer-events-none absolute left-7 top-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Customer value map / {projectId}</div>
              {BLOCK_ORDER.map((block) => <BlockFrame key={block} block={block} />)}
              {visibleNotes.map((note) => {
                const blockNotes = grouped[note.block];
                return <CanvasNote key={note.id} note={note} position={positions[note.id] ?? notePosition(note, blockNotes.findIndex((item) => item.id === note.id))} selected={selectedId === note.id} onSelect={() => setSelectedId(note.id)} onDragStart={(event) => startDrag(note, event)} onEdit={() => setEditingId(note.id)} onDelete={() => { remove.mutate(note.id); if (selectedId === note.id) setSelectedId(null); }} />;
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{visibleNotes.length} visible notes</span>
            <span>•</span>
            <span>Changes save automatically</span>
            <span>•</span>
            <span>Canvas is project-scoped</span>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Sticky note colors">
            {COLORS.map((color) => <button key={color.id} type="button" title={selected ? `Change note color to ${color.label}` : `Use ${color.label} for the next sticky`} onClick={() => selected ? updateColor(color.id) : setNewColor(color.id)} className={`h-5 w-5 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200 ${color.dot} ${((selected?.color ?? newColor) === color.id) ? "ring-2 ring-forge-500" : ""}`} />)}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Board guide</p>
              <h2 className="mt-1 text-base font-semibold text-slate-900">A canvas for conversations, not just fields</h2>
            </div>
            <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-forge-50 text-forge-600 sm:flex">⌘</div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[{ title: "Capture", body: "Add one clear assumption per sticky so the team can react quickly." }, { title: "Arrange", body: "Drag notes into a visual story and keep the important decisions in view." }, { title: "Connect", body: "Use the same project evidence in your generated docs and pitch deck." }].map((item, index) => <div key={item.title} className="rounded-xl bg-slate-50 p-3"><span className="font-mono text-[10px] text-forge-600">0{index + 1}</span><h3 className="mt-2 text-sm font-semibold text-slate-800">{item.title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{item.body}</p></div>)}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Inspector</p>
          {selected ? (
            <div className="mt-3 space-y-4">
              <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Selected sticky</p><p className="mt-1 text-sm font-semibold text-slate-900">{BLOCK_LABELS[selected.block]}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{selected.content}</p></div>
              <label className="block"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Move to block</span><select value={selected.block} onChange={(event) => { const block = event.target.value as BmcBlock; const layout = blockLayout(block); const position = { x: layout.x + 14, y: layout.y + 82 }; setPositions((current) => ({ ...current, [selected.id]: position })); update.mutate({ id: selected.id, patch: { block, position_x: position.x, position_y: position.y } }); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 outline-none focus:border-forge-400">{BLOCK_ORDER.map((block) => <option key={block} value={block}>{BLOCK_LABELS[block]}</option>)}</select></label>
              <div><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Color</span><div className="mt-2 flex gap-2">{COLORS.map((color) => <button key={color.id} type="button" onClick={() => updateColor(color.id)} className={`h-6 w-6 rounded-full ${color.dot} ${selected.color === color.id ? "ring-2 ring-forge-500 ring-offset-2" : ""}`} aria-label={`Set ${color.label} color`} />)}</div></div>
              <button type="button" onClick={() => setEditingId(selected.id)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-forge-300 hover:text-forge-700">Edit content</button>
            </div>
          ) : <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">Select a sticky note to inspect it, recolor it, or edit its content.</div>}
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mini-map</p><div className="relative mt-3 h-20 rounded-lg bg-slate-50">{BLOCK_ORDER.map((block) => { const layout = blockLayout(block); return <span key={block} className={`absolute rounded-sm border ${BLOCK_ACCENTS[block].border} ${BLOCK_ACCENTS[block].wash}`} style={{ left: `${(layout.x / BOARD_WIDTH) * 100}%`, top: `${(layout.y / BOARD_HEIGHT) * 100}%`, width: `${(layout.width / BOARD_WIDTH) * 100}%`, height: `${(layout.height / BOARD_HEIGHT) * 100}%` }} />; })}</div></div>
        </aside>
      </div>

      {adding ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Add sticky note"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-forge-600">New canvas insight</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Add a sticky note</h2></div><button type="button" onClick={() => setAdding(false)} className="text-xl text-slate-400 hover:text-slate-700" aria-label="Close">×</button></div><div className="mt-5 space-y-4"><label className="block"><span className="text-xs font-semibold text-slate-700">Canvas block</span><select value={newBlock} onChange={(event) => setNewBlock(event.target.value as BmcBlock)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"><option value="value_propositions">Value Propositions</option>{BLOCK_ORDER.filter((block) => block !== "value_propositions").map((block) => <option key={block} value={block}>{BLOCK_LABELS[block]}</option>)}</select></label><div><span className="text-xs font-semibold text-slate-700">Sticky color</span><div className="mt-2 flex gap-2">{COLORS.map((color) => <button key={color.id} type="button" onClick={() => setNewColor(color.id)} className={`h-7 w-7 rounded-full ${color.dot} ${newColor === color.id ? "ring-2 ring-forge-500 ring-offset-2" : ""}`} aria-label={`Use ${color.label} sticky`} />)}</div></div><NoteEditor onSave={addNote} onCancel={() => setAdding(false)} /></div></div></div> : null}
      {editingId ? (() => { const note = notes?.find((item) => item.id === editingId); return note ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Edit sticky note"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-forge-600">Edit {BLOCK_LABELS[note.block]}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Refine the insight</h2><div className="mt-5"><NoteEditor note={note} onSave={(content) => { update.mutate({ id: note.id, patch: { content } }); setEditingId(null); }} onCancel={() => setEditingId(null)} /></div></div></div> : null; })() : null}
    </div>
  );
}
