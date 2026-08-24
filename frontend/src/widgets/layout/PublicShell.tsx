import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Logo } from "../../shared/ui/Logo";
import { useAutoReveal } from "../../shared/ui/Reveal";

/** Anchor targets live on the landing page; links always point at "/#…". */
const NAV_LINKS = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

/**
 * Marketing shell (Prompt 21, polished 2026-08-24): sticky blurred navbar
 * with scroll-spy section highlighting, brand SVG logo, hash navigation that
 * works from any route ("/#features"), and a full modern footer. The
 * internal app keeps its own AppShell.
 */
export function PublicShell({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const [activeId, setActiveId] = useState<string>("");

  // Reveal any .sf-reveal elements on the current page (features grid,
  // how-it-works steps) and re-scan after every navigation.
  useAutoReveal(location.key);

  // Smooth-scroll to the target of "/#section" from any route.
  useEffect(() => {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [location]);

  // Scroll-spy: highlight the nav link of the most visible section.
  useEffect(() => {
    const sections = NAV_LINKS.map((link) => document.getElementById(link.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sections.length === 0) {
      setActiveId("");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [location.pathname, children]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="group flex items-center gap-2.5" aria-label="SpecForge Studio home">
            <Logo size={32} className="transition-transform duration-200 group-hover:scale-105" />
            <span className="text-sm font-semibold tracking-tight">SpecForge Studio</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            {NAV_LINKS.map((link) => {
              const active = activeId === link.id;
              return (
                <Link
                  key={link.id}
                  to={`/#${link.id}`}
                  aria-current={active ? "true" : undefined}
                  className={`relative rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
                    active ? "text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-forge-500 transition-all duration-300 ${
                      active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-50"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/signin"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors duration-150 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/checkout/plus"
              className="rounded-md bg-forge-600 px-3.5 py-1.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>

      {/* -------------------------------------------------------------- */}
      {/* Footer                                                          */}
      {/* -------------------------------------------------------------- */}
      <footer className="relative overflow-hidden border-t border-white/5 bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-forge-500/60 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[42rem] -translate-x-1/2 rounded-full bg-forge-600/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-14">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
            {/* Brand column */}
            <div>
              <Link to="/" className="group flex items-center gap-2.5" aria-label="SpecForge Studio home">
                <Logo size={36} className="transition-transform duration-200 group-hover:scale-105" />
                <span className="text-base font-semibold tracking-tight text-white">SpecForge Studio</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
                Turn visual plans into engineering reality — specs, diagrams, roadmaps and agent-ready
                task packs, all generated from one model.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Local-first · SQLite core
                </span>
                <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-slate-500">
                  v0.1
                </span>
              </div>
            </div>

            {/* Product column */}
            <nav aria-label="Product">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Product</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <Link
                      to={`/#${link.id}`}
                      className="text-slate-400 transition-colors duration-150 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Get started column */}
            <nav aria-label="Get started">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Get started</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link to="/register" className="text-slate-400 transition-colors duration-150 hover:text-white">
                    Create account
                  </Link>
                </li>
                <li>
                  <Link to="/signin" className="text-slate-400 transition-colors duration-150 hover:text-white">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/checkout/free" className="text-slate-400 transition-colors duration-150 hover:text-white">
                    Start for free
                  </Link>
                </li>
                <li>
                  <Link to="/checkout/plus" className="text-slate-400 transition-colors duration-150 hover:text-white">
                    Go Plus
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Plans column */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Plans</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <span className="text-slate-300">Free</span>
                  <span className="font-mono text-xs text-slate-500">$0/mo</span>
                </li>
                <li className="flex items-center justify-between gap-4 rounded-lg border border-forge-500/30 bg-forge-600/10 px-3 py-2">
                  <span className="text-white">
                    Plus <span className="ml-1 text-[10px] uppercase tracking-wide text-forge-300">popular</span>
                  </span>
                  <span className="font-mono text-xs text-forge-300">$19/mo</span>
                </li>
                <li className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <span className="text-slate-300">Premium</span>
                  <span className="font-mono text-xs text-slate-500">$49/mo</span>
                </li>
              </ul>
              <Link
                to="/#pricing"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forge-400 transition-colors duration-150 hover:text-forge-300"
              >
                Compare plans
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} SpecForge Studio. All rights reserved.</p>
            <p className="text-xs text-slate-600">Spec → docs → diagrams → tasks.</p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition-all duration-150 hover:border-white/25 hover:text-white"
            >
              <span aria-hidden="true">↑</span> Back to top
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
