import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../shared/api/client";
import { Button } from "../shared/ui/Button";

interface DeckSlide {
  kind: string;
  title: string;
  bullets: string[];
}

interface PresentationData {
  project: { id: string; name: string; description: string | null; status: string };
  stacks: string[];
  slides: DeckSlide[];
  generated_at: string;
}

function usePresentationData(projectId: string | undefined) {
  return useQuery<{ data: PresentationData }>({
    queryKey: ["presentation-data", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing project ID");
      const { data } = await api.get(`/presentation/${projectId}/data`);
      return data as { data: PresentationData };
    },
    enabled: !!projectId,
  });
}

async function downloadPptx(projectId: string) {
  const { data } = await api.get(`/presentation/${projectId}/pptx`, { responseType: "blob" });
  const blob = new Blob([data as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectId}-pitch-deck.pptx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function SlideCard({ slide }: { slide: DeckSlide }) {
  if (slide.kind === "title") {
    return (
      <div className="rounded-2xl bg-slate-900 text-white p-10 flex flex-col justify-center gap-4 print:bg-white print:text-slate-900 print:border print:border-slate-300">
        <h2 className="text-4xl font-bold leading-tight">{slide.title}</h2>
        {slide.bullets.length > 0 && (
          <p className="text-slate-400 text-lg mt-1 print:text-slate-500">{slide.bullets.join("\n")}</p>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-10 flex flex-col gap-4 print:border-slate-300">
      <h2 className="text-3xl font-bold text-slate-900 leading-tight">{slide.title}</h2>
      {slide.bullets.length === 0 ? (
        <p className="text-slate-400 text-base italic">No data available.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-slate-700 text-base leading-relaxed">
          {slide.bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-slate-400 mt-1 shrink-0" aria-hidden="true">&#x2022;</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PresentationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, error } = usePresentationData(projectId);
  const [current, setCurrent] = useState(0);

  const slides = data?.data?.slides ?? [];
  const total = slides.length;
  const atStart = current <= 0;
  const atEnd = current >= total - 1;

  const prev = useCallback(() => setCurrent((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrent((i) => Math.min(total - 1, i + 1)), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px] gap-2 text-slate-400">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading presentation data...
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="p-8 text-center text-red-600">
        Failed to load presentation data. Please try again later.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pitch Deck</h1>
          <p className="text-sm text-slate-500 mt-1">
            Live-computed from project data &middot; {new Date(data.data.generated_at).toLocaleString()}
          </p>
        </div>
        {projectId && (
          <Button variant="outline" size="sm" onClick={() => downloadPptx(projectId)}>
            Download .pptx
          </Button>
        )}
      </div>

      {/* Viewer */}
      <div className="flex flex-col items-center gap-4">
        {total > 0 && (
          <>
            <div className="w-full max-w-3xl">
              <SlideCard slide={slides[current]} />
            </div>
            {/* Dots + arrows */}
            <div className="flex items-center gap-3 print:hidden">
              <Button
                variant="outline"
                size="icon"
                disabled={atStart}
                onClick={prev}
                aria-label="Previous slide"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Button>
              <div className="flex gap-1.5">
                {slides.map((_: DeckSlide, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-indigo-600" : "bg-slate-300 hover:bg-slate-400"}`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                disabled={atEnd}
                onClick={next}
                aria-label="Next slide"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Button>
            </div>
            <p className="text-xs text-slate-400 print:hidden">
              Slide {current + 1} of {total} &middot; Use arrow keys
            </p>
          </>
        )}
      </div>

      {/* Print view: render all slides sequentially for print-to-PDF */}
      <div className="hidden print:block mt-12 print:mt-0">
        {slides.map((slide: DeckSlide, i: number) => (
          <div key={i} className="print:break-after-page pb-8 print:pb-0">
            <SlideCard slide={slide} />
          </div>
        ))}
      </div>
    </div>
  );
}
