"use client";

import React, { useEffect, useState } from "react";

interface TocEntry {
  id: string;
  label: string;
  level: 2 | 3;
}

export function OnThisPage({ content }: { content: React.RefObject<HTMLDivElement | null> }) {
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const root = content.current;
    if (!root) return;

    // Beri id heading yang belum punya
    const headings = Array.from(root.querySelectorAll<HTMLElement>("h2, h3"));
    const slug = (text: string) =>
      text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 64) || "sect";

    const collected: TocEntry[] = [];
    const seen = new Map<string, number>();
    headings.forEach((h) => {
      if (!h.id) {
        let base = slug(h.textContent || "sect");
        let n = seen.get(base) ?? 0;
        let id = n > 0 ? `${base}-${n}` : base;
        seen.set(base, n + 1);
        h.id = id;
      }
      collected.push({
        id: h.id,
        label: h.textContent?.trim() || h.id,
        level: h.tagName === "H2" ? 2 : 3,
      });
    });
    setEntries(collected);

    // IntersectionObserver untuk highlight
    const observer = new IntersectionObserver(
      (obs) => {
        for (const e of obs) {
          if (e.isIntersecting) {
            setActiveId((e.target as HTMLElement).id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [content]);

  if (entries.length === 0) return null;

  return (
    <nav className="hidden xl:block w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-l border-white/[0.06] pl-5 py-10">
      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-3">On this page</p>
      <ul className="space-y-1.5">
        {entries.map((e) => (
          <li key={e.id} className={e.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${e.id}`}
              className={`block text-[13px] leading-snug transition-colors ${
                activeId === e.id
                  ? "text-cyan-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {e.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
