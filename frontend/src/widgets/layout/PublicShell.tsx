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

const WINDOWS_DOWNLOAD_URL =
  (import.meta.env.VITE_WINDOWS_DOWNLOAD_URL as string | undefined) ||
  "/downloads/SpecForge-Studio-0.1.0-win-x64.exe";

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

        <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-12">
          <div className="mb-12 flex flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forge-300">Build with less ambiguity</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">From first idea to an executable delivery plan.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Model the system once. Keep decisions, docs, diagrams, approvals, and tasks traceable.</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link to="/checkout/plus" className="inline-flex items-center justify-center rounded-xl bg-forge-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-forge-400 active:scale-[0.98]">Start building <span className="ml-1.5" aria-hidden="true">→</span></Link>
              <a
                href={WINDOWS_DOWNLOAD_URL}
                download
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:text-white"
              >
                Windows app
              </a>
            </div>
          </div>
          <div className="grid gap-10 lg:grid-cols-[1.55fr_1fr_1fr_1.2fr]">
            {/* Brand column */}
            <div>
              <Link to="/" className="group flex items-center gap-2.5" aria-label="SpecForge Studio home">
                <Logo size={36} className="transition-transform duration-200 group-hover:scale-105" />
                <span className="text-base font-semibold tracking-tight text-white">SpecForge Studio</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
                A traceable engineering workspace for turning product intent into system design, delivery artifacts, and agent-ready execution.
              </p>
              <div className="mt-5 grid max-w-sm grid-cols-2 gap-2 text-[11px]">
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-400"><strong className="block font-mono text-slate-200">DB-first</strong>SQLite source of truth</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-400"><strong className="block font-mono text-slate-200">Traceable</strong>Decisions to tasks</span>
              </div>
            </div>

            {/* Product column */}
            <nav aria-label="Product">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Product</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/#features" className="text-slate-400 transition-colors duration-150 hover:text-white">Platform capabilities</Link></li>
                <li><Link to="/#how-it-works" className="text-slate-400 transition-colors duration-150 hover:text-white">How it works</Link></li>
                <li><Link to="/#pricing" className="text-slate-400 transition-colors duration-150 hover:text-white">Plans and limits</Link></li>
                <li><Link to="/#faq" className="text-slate-400 transition-colors duration-150 hover:text-white">FAQ</Link></li>
              </ul>
            </nav>

            {/* Get started column */}
            <nav aria-label="Get started">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Get started</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/register" className="text-slate-400 transition-colors duration-150 hover:text-white">Create an account</Link></li>
                <li><Link to="/signin" className="text-slate-400 transition-colors duration-150 hover:text-white">Sign in</Link></li>
                <li><Link to="/checkout/free" className="text-slate-400 transition-colors duration-150 hover:text-white">Explore Free</Link></li>
                <li><Link to="/checkout/plus" className="text-slate-400 transition-colors duration-150 hover:text-white">Choose Plus</Link></li>
                <li>
                  <a
                    href={WINDOWS_DOWNLOAD_URL}
                    download
                    className="text-slate-400 transition-colors duration-150 hover:text-white"
                  >
                    Download for Windows
                  </a>
                </li>
              </ul>
            </nav>

            {/* Plans column */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Plans at a glance</p>
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
            <p className="text-xs text-slate-600">Structured planning for teams that ship.</p>
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
