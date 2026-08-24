import { useEffect, useRef, type ReactNode } from "react";

/**
 * Observes every `.sf-reveal` element under `document` and adds `is-visible`
 * when it enters the viewport. Use once per page/shell to reveal elements
 * that carry the class directly (not wrapped in <Reveal>). Re-runs when
 * `dep` changes (e.g. after route changes).
 */
export function useAutoReveal(dep: unknown): void {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".sf-reveal:not(.is-visible)"));
    if (elements.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const el of elements) el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [dep]);
}

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms (applied as transition-delay). */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}

/**
 * Scroll-reveal wrapper (Prompt 21): fades/rises content into view the first
 * time it enters the viewport. Zero dependencies; disabled entirely under
 * prefers-reduced-motion (content renders immediately).
 */
export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as;
  return (
    <Tag
      ref={ref as never}
      className={`sf-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
