"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ChevronRight,
  Hash,
  FileText,
  Loader2,
  Menu,
  MessageSquareText,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { DOC_NAV } from "@/components/docs/docs-data";
import { OnThisPage } from "@/components/docs/toc";
import { AskAI } from "@/components/docs/ask-ai";

interface DocNavItem {
  label: string;
  href: string;
}
interface DocNavGroup {
  title: string;
  items: DocNavItem[];
}

interface SearchHit {
  kind: "page" | "heading";
  label: string;
  group: string;
  pageHref: string;
  href: string;
}

// Fetch statis isi dokumen saat build — scan heading h2/h3 dari file .tsx halaman docs via
// fetch konten?? Karena Next static, kami pakai index prebuilt:
// setiap halaman docs mendaftarkan headings-nya di modul `docs-index.ts` (dipetel manual).
// Pendekatan ini berjalan 100% offline tanpa API tambahan.
import { DOC_PAGE_HEADINGS } from "@/components/docs/docs-index";

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const [pageText, setPageText] = useState("");

  useEffect(() => {
    setMobileOpen(false);
    setQuery("");
    setPageText("");
  }, [pathname]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    // Simpan konten halaman untuk konteks Ask AI (text-only).
    const t = window.setTimeout(() => {
      setPageText(el.textContent || "");
    }, 120);
    return () => window.clearTimeout(t);
  }, [pathname, children]);

  const searchHits: SearchHit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const allItems = DOC_NAV.flatMap((g) =>
      g.items.map((i) => ({ ...i, group: g.title }))
    );

    const hits: SearchHit[] = [];

    // Halaman match:
    for (const i of allItems) {
      if (i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)) {
        hits.push({
          kind: "page",
          label: i.label,
          group: i.group,
          pageHref: i.href,
          href: i.href,
        });
      }
    }

    // Heading match (sub-bagian di dalam halaman):
    for (const page of DOC_PAGE_HEADINGS) {
      for (const h of page.headings) {
        if (h.text.toLowerCase().includes(q)) {
          hits.push({
            kind: "heading",
            label: h.text,
            group: `${page.title} — sub`,
            pageHref: page.href,
            href: `${page.href}#${h.id}`,
          });
        }
      }
    }

    // Hard cap biar dropdown tak meluap:
    return hits.slice(0, 24);
  }, [query]);

  const pageTitle =
    DOC_NAV.flatMap((g) => g.items).find((i) => {
      if (i.href === "/docs") return pathname === "/docs";
      return pathname.startsWith(i.href);
    })?.label || "Dokumentasi";

  const isActive = (href: string) => {
    if (href === "/docs") return pathname === "/docs";
    return pathname.startsWith(href);
  };

  // URL absolut halaman aktif (untuk prompt ala Railway)
  const absoluteHref = useMemo(() => {
    if (typeof window === "undefined") return pathname;
    return new URL(pathname, window.location.origin).toString();
  }, [pathname]);

  const askAI = {
    open: askOpen,
    onClose: () => setAskOpen(false),
    pageTitle,
    pageHref: absoluteHref,
    pageContent: pageText,
  };

  return (
    <div className="min-h-screen bg-[#030304] text-zinc-200 flex flex-col">
      {/* ── Topbar ─────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 border-b border-white/[0.06] bg-[#030304]/90 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto h-full px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white"
              aria-label="Toggle menu docs"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Logo href="/" size="md" />
            <span className="h-4 w-px bg-white/[0.12] hidden sm:block" />
            <Link
              href="/docs"
              className={`hidden sm:block text-sm font-medium transition-colors ${
                pathname === "/docs" || pathname.startsWith("/docs")
                  ? "text-cyan-300"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Docs
            </Link>
          </div>

          {/* Search */}
          <div className="relative hidden md:block w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari halaman atau bagian…"
              className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#0c0d10] pl-8 pr-10 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
            {query.trim().length > 0 && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {query.trim() && (
              <div className="absolute top-11 left-0 right-0 rounded-lg border border-white/[0.08] bg-[#0c0d10] shadow-xl shadow-black/60 overflow-hidden max-h-96 overflow-y-auto z-50">
                {searchHits.length > 0 ? (
                  <>
                    {searchHits.map((h, i) => (
                      <Link
                        key={`${h.href}-${i}`}
                        href={h.href}
                        onClick={() => setQuery("")}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors"
                      >
                        {h.kind === "page" ? (
                          <FileText className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />
                        ) : (
                          <Hash className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        )}
                        <span className="flex-1 truncate text-sm text-zinc-300">{h.label}</span>
                        <span className="text-[10px] font-mono uppercase text-zinc-600">
                          {h.kind === "page" ? h.group : "§ " + h.group}
                        </span>
                      </Link>
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-3 text-sm text-zinc-500">
                    Tidak ada hasil untuk “{query}”.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAskOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c0d10] px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors max-sm:hidden"
            >
              <MessageSquareText className="w-3.5 h-3.5 text-cyan-400" />
              Ask AI
            </button>
            <a
              href="https://github.com/KOTACLOUD-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-zinc-500 hover:text-cyan-300 transition-colors"
            >
              GitHub <ArrowUpRight className="w-3 h-3" />
            </a>
            <Button size="sm" variant="primary" className="bg-cyan-500/90 hover:bg-cyan-400 text-black font-semibold">
              <Link href="/register">Mulai Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content + TOC ─────────────────── */}
      <div className="flex flex-1 pt-14">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-white/[0.06] bg-[#060608] sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto flex-col">
          <DocsSidebarContent pathname={pathname} isActive={isActive} />
          {/* Tombol Ask AI di sidebar (mobile juga) */}
          <div className="mt-auto p-4 border-t border-white/[0.06]">
            <button
              onClick={() => setAskOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c0d10] px-3 py-2 text-xs font-medium text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Ask AI about this page
            </button>
          </div>
        </aside>

        {/* Sidebar (mobile overlay) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
            <aside className="absolute top-14 left-0 bottom-0 w-72 border-r border-white/[0.08] bg-[#060608] overflow-y-auto flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <DocsSidebarContent pathname={pathname} isActive={isActive} />
              </div>
              <div className="p-4 border-t border-white/[0.06]">
                <button
                  onClick={() => { setAskOpen(true); setMobileOpen(false); }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c0d10] px-3 py-2 text-xs font-medium text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Ask AI about this page
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 flex justify-center">
          <div ref={mainRef} className="max-w-3xl w-full min-w-0 px-5 sm:px-8 py-10">
            {children}
          </div>
        </main>

        {/* Right rail: On this page */}
        <OnThisPage content={mainRef} />
      </div>

      {/* Ask AI drawer */}
      <AskAI {...askAI} />
    </div>
  );
}

function DocsSidebarContent({
  pathname,
  isActive,
}: {
  pathname: string;
  isActive: (href: string) => boolean;
}) {
  return (
    <nav className="px-4 py-6 space-y-7">
      {DOC_NAV.map((group) => (
        <div key={group.title}>
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-2 px-2">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-cyan-500/10 text-cyan-300 font-medium"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
