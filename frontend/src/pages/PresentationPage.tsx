import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../shared/api/client";
import { API_BASE_URL } from "../shared/config";
import { Button } from "../shared/ui/Button";

type SlideKind = "title" | "bmc_block" | "market" | "business_overview" | "features" | "architecture" | "roadmap" | "team" | "metrics";
type ElementType = "text" | "image" | "shape";
type ShapeType = "rectangle" | "circle" | "line";
type ResizeDirection = "nw" | "ne" | "sw" | "se";
type FontFamily = "Aptos" | "Calibri" | "Arial" | "Times New Roman" | "Georgia" | "Verdana" | "Trebuchet MS" | "Courier New" | "Impact";

type SlideElement = {
  id: string;
  type: ElementType;
  text?: string;
  src?: string;
  shape?: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  fontFamily?: FontFamily;
  fontSize?: number;
  color?: string;
  background?: string;
  fontWeight?: "400" | "600" | "700";
  align?: "left" | "center" | "right";
  opacity?: number;
};

type DeckSlide = { kind: SlideKind | string; title: string; bullets: string[]; elements?: SlideElement[] };
type PresentationTheme = "paper" | "graphite" | "violet";

interface PresentationData {
  project: { id: string; name: string; description: string | null; status: string };
  stacks: string[];
  slides: DeckSlide[];
  generated_at: string;
}

function usePresentationData(projectId: string | undefined) {
  return useQuery<PresentationData>({
    queryKey: ["presentation-data", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing project ID");
      return api<PresentationData>(`/presentation/${projectId}/data`);
    },
    enabled: !!projectId,
  });
}

async function downloadPptx(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/presentation/${projectId}/pptx`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to download the presentation.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectId}-pitch-deck.pptx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const THEME_STYLES: Record<PresentationTheme, { label: string; stage: string; card: string; accent: string; ink: string }> = {
  paper: { label: "Paper", stage: "bg-white", card: "border-slate-200 bg-white", accent: "#4f46e5", ink: "#0f172a" },
  graphite: { label: "Graphite", stage: "bg-slate-950", card: "border-slate-700 bg-slate-900", accent: "#a78bfa", ink: "#f8fafc" },
  violet: { label: "Violet", stage: "bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950", card: "border-violet-700/60 bg-violet-950/70", accent: "#c4b5fd", ink: "#f8fafc" },
};

const FONT_OPTIONS: FontFamily[] = ["Aptos", "Calibri", "Arial", "Times New Roman", "Georgia", "Verdana", "Trebuchet MS", "Courier New", "Impact"];

function createElements(slide: DeckSlide): SlideElement[] {
  const elements: SlideElement[] = [{ id: "title", type: "text", text: slide.title, x: 8, y: slide.kind === "title" ? 33 : 8, w: 82, h: 13, fontFamily: "Aptos", fontSize: slide.kind === "title" ? 30 : 22, color: "#0f172a", fontWeight: "700", align: "left" }];
  if (slide.kind !== "title") elements.push({ id: "rule", type: "shape", shape: "rectangle", x: 8, y: 23, w: 10, h: 1.2, background: "#6366f1" });
  slide.bullets.slice(0, 6).forEach((bullet, index) => elements.push({ id: `bullet-${index}`, type: "text", text: `• ${bullet}`, x: 9, y: slide.kind === "title" ? 55 + index * 8 : 31 + index * 8, w: 78, h: 6, fontFamily: "Aptos", fontSize: 12, color: "#475569", fontWeight: "400", align: "left" }));
  return elements;
}

function normalizeSlide(slide: DeckSlide): DeckSlide {
  return { ...slide, bullets: slide.bullets ?? [], elements: slide.elements?.length ? slide.elements : createElements(slide) };
}

function ResizeHandles({ onResize }: { onResize: (direction: ResizeDirection, event: ReactPointerEvent<HTMLButtonElement>) => void }) {
  const handles: Array<{ direction: ResizeDirection; position: string; cursor: string }> = [
    { direction: "nw", position: "-left-1.5 -top-1.5", cursor: "cursor-nwse-resize" },
    { direction: "ne", position: "-right-1.5 -top-1.5", cursor: "cursor-nesw-resize" },
    { direction: "sw", position: "-bottom-1.5 -left-1.5", cursor: "cursor-nesw-resize" },
    { direction: "se", position: "-bottom-1.5 -right-1.5", cursor: "cursor-nwse-resize" },
  ];
  return <>{handles.map(({ direction, position, cursor }) => <button key={direction} type="button" aria-label={`Resize ${direction}`} onPointerDown={(event) => onResize(direction, event)} className={`absolute z-20 h-3 w-3 rounded-sm border-2 border-white bg-forge-600 shadow ${position} ${cursor}`} />)}</>;
}

function SlideCanvas({ slide, theme, editing, selectedId, onSelect, onResize, presenter = false }: { slide: DeckSlide; theme: PresentationTheme; editing?: boolean; selectedId?: string | null; onSelect?: (id: string) => void; onResize?: (id: string, direction: ResizeDirection, event: ReactPointerEvent<HTMLButtonElement>) => void; presenter?: boolean }) {
  const style = THEME_STYLES[theme];
  const elements = slide.elements ?? createElements(slide);
  const dark = theme !== "paper";
  return (
    <div data-slide-canvas className={`relative aspect-video w-full overflow-hidden rounded-2xl border shadow-2xl ${style.stage} ${dark ? "text-white" : "text-slate-900"} ${presenter ? "rounded-xl" : ""}`}>
      <div className={`absolute right-5 top-4 z-10 font-mono text-[9px] uppercase tracking-[0.24em] ${dark ? "text-white/35" : "text-slate-300"}`}>SPECFORGE / LIVE NARRATIVE</div>
      {elements.map((element) => {
        const selected = editing && selectedId === element.id;
        const base: React.CSSProperties = { left: `${element.x}%`, top: `${element.y}%`, width: `${element.w}%`, height: `${element.h}%`, opacity: element.opacity ?? 1, fontFamily: element.fontFamily, fontSize: `${element.fontSize ?? 14}px`, color: element.color ?? style.ink, fontWeight: element.fontWeight, textAlign: element.align, lineHeight: 1.2 };
        if (element.type === "shape") return <div key={element.id} role="button" tabIndex={0} onClick={() => onSelect?.(element.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect?.(element.id); }} aria-label={`Select ${element.shape ?? "shape"}`} className={`absolute border-0 p-0 ${selected ? "ring-2 ring-forge-500 ring-offset-2" : ""}`} style={{ ...base, background: element.shape === "line" ? "transparent" : element.background ?? style.accent, borderRadius: element.shape === "circle" ? "999px" : "4px", borderTop: element.shape === "line" ? `3px solid ${element.background ?? style.accent}` : undefined }}>{selected && onResize ? <ResizeHandles onResize={(direction, event) => onResize(element.id, direction, event)} /> : null}</div>;
        if (element.type === "image") return <div key={element.id} role="button" tabIndex={0} onClick={() => onSelect?.(element.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect?.(element.id); }} aria-label="Select image" className={`absolute overflow-hidden rounded-lg border-0 p-0 ${selected ? "ring-2 ring-forge-500 ring-offset-2" : ""}`} style={base}>{element.src ? <img src={element.src} alt={element.text ?? "Slide visual"} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Add image</span>}{selected && onResize ? <ResizeHandles onResize={(direction, event) => onResize(element.id, direction, event)} /> : null}</div>;
        return <div key={element.id} role="button" tabIndex={0} onClick={() => onSelect?.(element.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect?.(element.id); }} className={`absolute overflow-hidden border-0 bg-transparent p-0 text-left ${selected ? "rounded ring-2 ring-forge-500 ring-offset-2" : ""}`} style={base}>{element.text}{selected && onResize ? <ResizeHandles onResize={(direction, event) => onResize(element.id, direction, event)} /> : null}</div>;
      })}
      <div className={`absolute bottom-4 left-6 right-6 flex items-center justify-between border-t pt-2 text-[9px] font-mono ${dark ? "border-white/10 text-white/35" : "border-slate-200 text-slate-400"}`}><span>{slide.kind === "title" ? "Project narrative" : "Evidence-led storyline"}</span><span>SF / {style.label.toUpperCase()}</span></div>
    </div>
  );
}

function Thumbnail({ slide, index, active, theme, onClick }: { slide: DeckSlide; index: number; active: boolean; theme: PresentationTheme; onClick: () => void }) {
  const dark = theme !== "paper";
  return <button type="button" onClick={onClick} className={`group w-full rounded-xl p-1 text-left transition ${active ? "bg-forge-500 shadow-lg shadow-forge-500/20" : "bg-transparent hover:bg-slate-100"}`} aria-label={`Open slide ${index + 1}`}><div className={`relative aspect-video overflow-hidden rounded-lg border p-2 ${THEME_STYLES[theme].stage} ${dark ? "border-white/10" : "border-slate-200"}`}><span className={`absolute right-1.5 top-1.5 font-mono text-[8px] ${dark ? "text-white/40" : "text-slate-300"}`}>{String(index + 1).padStart(2, "0")}</span><p className={`mt-4 line-clamp-2 text-left text-[10px] font-bold leading-tight ${dark ? "text-white" : "text-slate-800"}`}>{slide.title}</p><div className={`mt-2 h-0.5 w-6 ${theme === "violet" ? "bg-violet-300" : "bg-forge-500"}`} /><p className={`mt-2 line-clamp-2 text-[8px] ${dark ? "text-slate-400" : "text-slate-500"}`}>{slide.bullets.join(" · ") || "Blank slide"}</p></div></button>;
}

export default function PresentationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, error } = usePresentationData(projectId);
  const liveSlides = useMemo(() => (data?.slides ?? []).map(normalizeSlide), [data?.slides]);
  const [draftSlides, setDraftSlides] = useState<DeckSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [editing, setEditing] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [theme, setTheme] = useState<PresentationTheme>("paper");
  const [zoom, setZoom] = useState(90);
  const [showGrid, setShowGrid] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [speakerNotes, setSpeakerNotes] = useState<Record<number, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (liveSlides.length) setDraftSlides(liveSlides); }, [liveSlides]);

  const slides = draftSlides.length ? draftSlides : liveSlides;
  const total = slides.length;
  const activeSlide = slides[current];
  const activeElement = activeSlide?.elements?.find((element) => element.id === selectedId);
  const hasLocalEdits = data ? JSON.stringify(data.slides) !== JSON.stringify(draftSlides.map(({ elements: _elements, ...slide }) => slide)) : false;
  const atStart = current <= 0;
  const atEnd = current >= Math.max(0, total - 1);
  const progress = total ? Math.round(((current + 1) / total) * 100) : 0;
  const activeTheme = useMemo(() => THEME_STYLES[theme], [theme]);

  const prev = useCallback(() => setCurrent((index) => Math.max(0, index - 1)), []);
  const next = useCallback(() => setCurrent((index) => Math.min(Math.max(0, total - 1), index + 1)), [total]);

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (event.key === "ArrowLeft" || event.key === "PageUp") prev();
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") { event.preventDefault(); next(); }
      if (event.key.toLowerCase() === "p") setPresenting((value) => !value);
      if (event.key === "Escape") setPresenting(false);
      if ((event.key === "Delete" || event.key === "Backspace") && editing && selectedId) removeElement();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  useEffect(() => { if (current >= total && total > 0) setCurrent(total - 1); }, [current, total]);

  function updateSlide(mutator: (slide: DeckSlide) => DeckSlide) { setDraftSlides((items) => items.map((slide, index) => index === current ? mutator(slide) : slide)); }
  function patchElement(patch: Partial<SlideElement>) { if (!selectedId) return; updateSlide((slide) => ({ ...slide, elements: (slide.elements ?? []).map((element) => element.id === selectedId ? { ...element, ...patch } : element) })); }
  function resizeElement(id: string, direction: ResizeDirection, startEvent: ReactPointerEvent<HTMLButtonElement>) {
    startEvent.preventDefault();
    startEvent.stopPropagation();
    const stage = startEvent.currentTarget.closest("[data-slide-canvas]") as HTMLElement | null;
    const element = activeSlide?.elements?.find((item) => item.id === id);
    if (!stage || !element) return;
    const bounds = stage.getBoundingClientRect();
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const start = { x: element.x, y: element.y, w: element.w, h: element.h };
    const minW = element.type === "shape" && element.shape === "line" ? 8 : 10;
    const minH = element.type === "shape" && element.shape === "line" ? 1.2 : 5;
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const handleMove = (event: PointerEvent) => {
      const dx = ((event.clientX - startX) / bounds.width) * 100;
      const dy = ((event.clientY - startY) / bounds.height) * 100;
      let x = start.x;
      let y = start.y;
      let w = start.w;
      let h = start.h;
      if (direction.includes("e")) w = clamp(start.w + dx, minW, 100 - start.x);
      if (direction.includes("s")) h = clamp(start.h + dy, minH, 100 - start.y);
      if (direction.includes("w")) { x = clamp(start.x + dx, 0, start.x + start.w - minW); w = start.w + (start.x - x); }
      if (direction.includes("n")) { y = clamp(start.y + dy, 0, start.y + start.h - minH); h = start.h + (start.y - y); }
      setDraftSlides((items) => items.map((slide, index) => index === current ? { ...slide, elements: (slide.elements ?? []).map((item) => item.id === id ? { ...item, x, y, w, h } : item) } : slide));
    };
    const handleUp = () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }
  function addElement(type: ElementType) {
    const id = `${type}-${Date.now()}`;
    const element: SlideElement = type === "text" ? { id, type, text: "New text box", x: 28, y: 42, w: 44, h: 10, fontFamily: "Aptos", fontSize: 16, color: activeTheme.ink, fontWeight: "600", align: "center" } : type === "image" ? { id, type, text: "Uploaded visual", x: 60, y: 34, w: 28, h: 28 } : { id, type, shape: "rectangle", x: 30, y: 55, w: 40, h: 2, background: activeTheme.accent };
    updateSlide((slide) => ({ ...slide, elements: [...(slide.elements ?? []), element] }));
    setSelectedId(id);
    setEditing(true);
  }
  function removeElement() { if (!selectedId) return; updateSlide((slide) => ({ ...slide, elements: (slide.elements ?? []).filter((element) => element.id !== selectedId) })); setSelectedId(null); }
  function moveLayer(direction: "up" | "down") { if (!selectedId) return; updateSlide((slide) => { const elements = [...(slide.elements ?? [])]; const index = elements.findIndex((element) => element.id === selectedId); const destination = direction === "up" ? index + 1 : index - 1; if (index < 0 || destination < 0 || destination >= elements.length) return slide; const [item] = elements.splice(index, 1); if (item) elements.splice(destination, 0, item); return { ...slide, elements }; }); }
  function patchSlideTitle(title: string) { updateSlide((slide) => ({ ...slide, title, elements: (slide.elements ?? []).map((element) => element.id === "title" ? { ...element, text: title } : element) })); }
  function addSlide() { const slide = normalizeSlide({ kind: "features", title: "New slide", bullets: ["Add your first talking point"] }); setDraftSlides((items) => [...items, slide]); setCurrent(total); setEditing(true); setSelectedId("title"); }
  function duplicateSlide() { if (!activeSlide) return; const copy = normalizeSlide({ ...activeSlide, title: `${activeSlide.title} — copy`, bullets: [...activeSlide.bullets], elements: (activeSlide.elements ?? []).map((element) => ({ ...element, id: `${element.id}-copy` })) }); setDraftSlides((items) => [...items.slice(0, current + 1), copy, ...items.slice(current + 1)]); setCurrent(current + 1); setSelectedId("title"); }
  function deleteSlide() { if (total <= 1) return; setDraftSlides((items) => items.filter((_, index) => index !== current)); setCurrent((index) => Math.max(0, Math.min(index, total - 2))); setSelectedId(null); }
  function moveSlide(direction: -1 | 1) { const destination = current + direction; if (destination < 0 || destination >= total) return; setDraftSlides((items) => { const nextSlides = [...items]; const [item] = nextSlides.splice(current, 1); if (item) nextSlides.splice(destination, 0, item); return nextSlides; }); setCurrent(destination); }
  function resetDraft() { setDraftSlides(liveSlides); setCurrent(0); setSelectedId(null); setEditing(false); }
  async function enterPresenterMode() { setPresenting(true); if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.().catch(() => undefined); }
  function updateNotes(event: ChangeEvent<HTMLTextAreaElement>) { setSpeakerNotes((items) => ({ ...items, [current]: event.target.value })); }
  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file || !selectedId) return; const reader = new FileReader(); reader.onload = () => patchElement({ src: String(reader.result) }); reader.readAsDataURL(file); }

  if (isLoading) return <div className="flex min-h-[500px] items-center justify-center gap-2 text-slate-400">Loading presentation data...</div>;
  if (error || !data) return <div className="p-8 text-center text-red-600">Failed to load presentation data. Please try again later.</div>;

  if (presenting && activeSlide) return <div className={`fixed inset-0 z-50 flex flex-col ${activeTheme.stage} p-4 text-white sm:p-8`}><div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-forge-300">Presenter View</p><p className="mt-1 text-xs text-white/50">{data.project.name} · Slide {current + 1} of {total}</p></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-white/10 px-3 py-2 text-xs text-white/50 sm:inline">{progress}% complete</span><button type="button" onClick={() => setPresenting(false)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:border-white/40 hover:text-white">Exit Presenter View <span className="font-mono">Esc</span></button></div></div><div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 items-center justify-center py-5"><div className="w-full max-w-6xl"><SlideCanvas slide={activeSlide} theme={theme} presenter /></div></div><div className="mx-auto flex w-full max-w-[1600px] items-center gap-4"><button type="button" onClick={prev} disabled={atStart} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold disabled:opacity-30">← Previous</button><div className="flex-1"><div className="mb-2 flex justify-between text-[10px] uppercase tracking-widest text-white/40"><span>Presentation progress</span><span>{current + 1} / {total}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-forge-400 transition-all duration-300" style={{ width: `${progress}%` }} /></div></div><button type="button" onClick={next} disabled={atEnd} className="rounded-xl bg-forge-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30">Next →</button></div></div>;

  return <div className="space-y-5"><section className="relative overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" /><div className="relative flex flex-wrap items-end justify-between gap-5"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300"><span className="h-1.5 w-1.5 rounded-full bg-violet-300" />Narrative workspace</div><p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/70">Pitch Deck</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Presentation Studio</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Build slides like PowerPoint: add elements, refine typography, place visuals, manage layers, and present with confidence.</p></div><div className="flex flex-wrap items-center gap-2"><Link to={`/projects/${projectId}`} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-violet-400/50 hover:text-white">Back to project</Link><Button variant="secondary" size="sm" onClick={() => void downloadPptx(projectId!)}>Download .pptx</Button><button type="button" onClick={() => void enterPresenterMode()} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400">Present ⛶</button></div></div><div className="relative mt-6 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-400"><span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">{total} slides</span><span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">Live data</span><span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">{hasLocalEdits ? "Local edits" : "Synced"}</span><span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">PowerPoint tools</span></div></section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">✦</span><div><p className="text-sm font-semibold text-slate-900">Presentation studio</p><p className="text-[11px] text-slate-500">Draft edits are local until the project data is explicitly saved.</p></div></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setEditing((value) => !value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${editing ? "bg-forge-600 text-white" : "border border-slate-200 text-slate-600 hover:border-forge-300"}`}>{editing ? "Editing on" : "Edit deck"}</button><button type="button" onClick={() => addElement("text")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-forge-300">+ Text</button><button type="button" onClick={() => addElement("image")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-forge-300">+ Image</button><button type="button" onClick={() => addElement("shape")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-forge-300">+ Shape</button><button type="button" onClick={() => setShowNotes((value) => !value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${showNotes ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600"}`}>Speaker notes</button><button type="button" onClick={() => setShowGrid((value) => !value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${showGrid ? "border-slate-400 bg-slate-100 text-slate-800" : "border-slate-200 text-slate-600"}`}>Grid</button><button type="button" onClick={() => setZoom((value) => Math.max(55, value - 5))} className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600">−</button><span className="w-10 text-center font-mono text-[11px] text-slate-500">{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(125, value + 5))} className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600">+</button></div></div>

      <div className="grid min-h-[720px] xl:grid-cols-[220px_minmax(0,1fr)_280px]"><aside className="border-b border-slate-200 bg-slate-50/60 p-3 xl:border-b-0 xl:border-r"><div className="flex items-center justify-between px-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Slides</p><span className="font-mono text-[10px] text-slate-400">{total}</span></div><div className="mt-3 flex max-h-48 gap-3 overflow-x-auto pb-2 xl:max-h-[600px] xl:flex-col xl:overflow-y-auto xl:overflow-x-hidden">{slides.map((slide, index) => <Thumbnail key={`${index}-${slide.title}`} slide={slide} index={index} active={index === current} theme={theme} onClick={() => { setCurrent(index); setSelectedId("title"); }} />)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={addSlide} className="rounded-lg border border-dashed border-slate-300 px-2 py-2 text-[11px] font-semibold text-slate-500 hover:border-forge-400 hover:text-forge-700">+ New</button><button type="button" onClick={duplicateSlide} disabled={!activeSlide} className="rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-500 disabled:opacity-40">Duplicate</button></div></aside>

        <main className={`min-w-0 overflow-auto bg-[#eef1f5] p-4 sm:p-7 ${showGrid ? "[background-image:linear-gradient(#d9dee7_1px,transparent_1px),linear-gradient(90deg,#d9dee7_1px,transparent_1px)] [background-size:24px_24px]" : ""}`}>{activeSlide ? <><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs text-slate-500"><span className="font-semibold text-slate-700">Slide {current + 1} of {total}</span><span>•</span><span>{editing ? "Design editor" : "Canvas preview"}</span></div><div className="flex items-center gap-1.5"><button type="button" onClick={() => moveSlide(-1)} disabled={atStart} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 disabled:opacity-30" aria-label="Move slide up">↑</button><button type="button" onClick={() => moveSlide(1)} disabled={atEnd} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 disabled:opacity-30" aria-label="Move slide down">↓</button><button type="button" onClick={deleteSlide} disabled={total <= 1} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-rose-500 disabled:opacity-30" aria-label="Delete slide">Delete</button></div></div><div className="mx-auto mt-4 max-w-5xl" style={{ width: `${zoom}%` }}><SlideCanvas slide={activeSlide} theme={theme} editing={editing} selectedId={selectedId} onSelect={setSelectedId} onResize={resizeElement} /></div><div className="mx-auto mt-4 flex max-w-5xl items-center justify-between"><button type="button" onClick={prev} disabled={atStart} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-30">← Previous</button><div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} /></div><button type="button" onClick={next} disabled={atEnd} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-30">Next →</button></div>{showNotes ? <div className="mx-auto mt-4 max-w-5xl rounded-xl border border-violet-200 bg-violet-50 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-violet-800">Speaker notes · slide {current + 1}</p><span className="text-[10px] text-violet-500">Private to this working session</span></div><textarea value={speakerNotes[current] ?? ""} onChange={updateNotes} rows={3} placeholder="Add the context you want to say out loud…" className="mt-2 w-full resize-none rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-violet-300" /></div> : null}</> : <div className="flex min-h-[400px] items-center justify-center text-sm text-slate-400">Add a slide to start the narrative.</div>}</main>

        <aside className="border-t border-slate-200 bg-white p-4 xl:border-l xl:border-t-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Format & design</p>{activeElement ? <div className="mt-4 space-y-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-700">Selected {activeElement.type}</p><button type="button" onClick={removeElement} className="text-[11px] font-semibold text-rose-500">Remove</button></div>{activeElement.type === "text" ? <><label className="block text-[11px] font-semibold text-slate-600">Text<textarea value={activeElement.text ?? ""} onChange={(event) => patchElement({ text: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-forge-400" /></label><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-slate-600">Font<select value={activeElement.fontFamily ?? "Aptos"} onChange={(event) => patchElement({ fontFamily: event.target.value as FontFamily })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-normal text-slate-700">{FONT_OPTIONS.map((font) => <option key={font}>{font}</option>)}</select></label><label className="text-[11px] font-semibold text-slate-600">Size<input type="number" min={8} max={72} value={activeElement.fontSize ?? 14} onChange={(event) => patchElement({ fontSize: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-normal text-slate-700" /></label></div><label className="block text-[11px] font-semibold text-slate-600">Text color<input type="color" value={activeElement.color ?? activeTheme.ink} onChange={(event) => patchElement({ color: event.target.value })} className="mt-1 h-9 w-full rounded border border-slate-200" /></label><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => patchElement({ fontWeight: "400" })} className="rounded border border-slate-200 py-1 text-xs">Regular</button><button type="button" onClick={() => patchElement({ fontWeight: "600" })} className="rounded border border-slate-200 py-1 text-xs font-semibold">Bold</button><button type="button" onClick={() => patchElement({ align: activeElement.align === "center" ? "left" : "center" })} className="rounded border border-slate-200 py-1 text-xs">Align</button></div></> : activeElement.type === "image" ? <><label className="block text-[11px] font-semibold text-slate-600">Image URL<input value={activeElement.src ?? ""} onChange={(event) => patchElement({ src: event.target.value })} placeholder="Paste an image URL" className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700" /></label><input ref={imageInput} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /><button type="button" onClick={() => imageInput.current?.click()} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Upload image</button><p className="text-[10px] leading-relaxed text-slate-400">Uploaded images remain in this local working draft until a persistence API is enabled.</p></> : <><label className="block text-[11px] font-semibold text-slate-600">Shape<select value={activeElement.shape ?? "rectangle"} onChange={(event) => patchElement({ shape: event.target.value as ShapeType })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700"><option value="rectangle">Rectangle</option><option value="circle">Circle</option><option value="line">Line</option></select></label><label className="block text-[11px] font-semibold text-slate-600">Color<input type="color" value={activeElement.background ?? activeTheme.accent} onChange={(event) => patchElement({ background: event.target.value })} className="mt-1 h-9 w-full rounded border border-slate-200" /></label></>}<div className="border-t border-slate-100 pt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Position & layers</p><div className="mt-2 grid grid-cols-4 gap-1.5"><button type="button" onClick={() => patchElement({ x: Math.max(0, (activeElement.x ?? 0) - 2) })} className="rounded border border-slate-200 py-1 text-xs">←</button><button type="button" onClick={() => patchElement({ y: Math.max(0, (activeElement.y ?? 0) - 2) })} className="rounded border border-slate-200 py-1 text-xs">↑</button><button type="button" onClick={() => patchElement({ y: Math.min(90, (activeElement.y ?? 0) + 2) })} className="rounded border border-slate-200 py-1 text-xs">↓</button><button type="button" onClick={() => patchElement({ x: Math.min(90, (activeElement.x ?? 0) + 2) })} className="rounded border border-slate-200 py-1 text-xs">→</button></div><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => moveLayer("up")} className="rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600">Bring forward</button><button type="button" onClick={() => moveLayer("down")} className="rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600">Send backward</button></div></div></div> : <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">Select an element on the slide to edit its text, font, size, Text color, position, image, shape, or layer order. Selected elements show direct resize handles on the canvas. Use the buttons above to add elements.</div>}<div className="mt-6"><p className="text-xs font-semibold text-slate-700">Theme</p><div className="mt-2 grid grid-cols-3 gap-2">{(Object.keys(THEME_STYLES) as PresentationTheme[]).map((item) => <button key={item} type="button" onClick={() => setTheme(item)} className={`rounded-lg border p-2 text-left ${theme === item ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"}`}><span className={`block h-8 rounded ${THEME_STYLES[item].stage}`} /><span className="mt-1 block text-[10px] font-medium text-slate-600">{THEME_STYLES[item].label}</span></button>)}</div></div><div className="mt-4 space-y-2"><button type="button" onClick={enterPresenterMode} className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">Open Presenter View</button>{hasLocalEdits ? <button type="button" onClick={resetDraft} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Reset to live data</button> : null}</div><div className="mt-6 rounded-xl border border-dashed border-slate-200 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shortcuts</p><p className="mt-2 text-[11px] leading-relaxed text-slate-500"><span className="font-mono text-slate-700">← →</span> navigate · <span className="font-mono text-slate-700">Space</span> next · <span className="font-mono text-slate-700">P</span> present · <span className="font-mono text-slate-700">Esc</span> exit · <span className="font-mono text-slate-700">Delete</span> remove selected</p></div></aside></div></section><div className="hidden print:block mt-12 print:mt-0">{slides.map((slide, index) => <div key={index} className="print:break-after-page pb-8 print:pb-0"><SlideCanvas slide={slide} theme="paper" /></div>)}</div></div>;
}
