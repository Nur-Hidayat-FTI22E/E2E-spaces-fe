"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Info,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

// ── CodeBlock: blok kode dengan copy button & label ───────────────
export function CodeBlock({
  code,
  language,
  title,
  className = "",
}: {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className={`rounded-lg border border-white/[0.07] bg-[#0a0b0e] overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-[#0c0d10]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{title}</span>
          {language && (
            <span className="text-[10px] font-mono text-zinc-600">{language}</span>
          )}
        </div>
      )}
      <div className="relative group">
        <button
          onClick={copy}
          aria-label="Copy code"
          className="absolute top-2 right-2 p-1.5 rounded-md border border-white/[0.08] bg-[#141417]/90 text-zinc-500 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors opacity-0 group-hover:opacity-100 max-sm:opacity-100"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <pre className="p-4 pr-12 text-[13px] leading-relaxed font-mono text-zinc-300 overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// ── InlineCode: kode inline ───────────────────────────────────────
export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-white/[0.06] text-[13px] font-mono text-cyan-300">
      {children}
    </code>
  );
}

// ── Callout: catatan / peringatan / tips ──────────────────────────
const CALLOUT_STYLES: Record<string, { border: string; title: string; Icon: React.ComponentType<{ className?: string }> }> = {
  info: {
    border: "border-cyan-500/25 bg-cyan-500/[0.06]",
    title: "text-cyan-300",
    Icon: Info,
  },
  warning: {
    border: "border-amber-500/25 bg-amber-500/[0.06]",
    title: "text-amber-300",
    Icon: AlertTriangle,
  },
  tip: {
    border: "border-emerald-500/25 bg-emerald-500/[0.06]",
    title: "text-emerald-300",
    Icon: Lightbulb,
  },
};

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warning" | "tip";
  title: string;
  children: React.ReactNode;
}) {
  const s = CALLOUT_STYLES[type] ?? CALLOUT_STYLES.info;
  return (
    <div className={`rounded-lg border px-4 py-3 my-4 ${s.border}`}>
      <p className={`text-sm font-semibold mb-1 flex items-center gap-2 ${s.title}`}>
        <s.Icon className="w-4 h-4 shrink-0" aria-hidden /> {title}
      </p>
      <div className="text-sm text-zinc-400 leading-relaxed [&_code]:text-[12px]">{children}</div>
    </div>
  );
}

// ── DocPageHeader: judul halaman + deskripsi + breadcrumb ─────────
export function DocPageHeader({
  title,
  description,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <header className="mb-10">
      {breadcrumbs && (
        <nav className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-3">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b.label + i}>
              {i > 0 && <span className="text-zinc-700">/</span>}
              {b.href ? (
                <a href={b.href} className="hover:text-cyan-300 transition-colors">{b.label}</a>
              ) : (
                <span className="text-zinc-500">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">{title}</h1>
      {description && <p className="text-base text-zinc-400 max-w-3xl leading-relaxed">{description}</p>}
    </header>
  );
}

// ── DocSection: sub-bagian halaman ────────────────────────────────
export function DocSection({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-white/[0.06]">{title}</h2>
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed [&_p]:mb-3">{children}</div>
    </section>
  );
}

// ── DocTable: tabel dokumentasi ───────────────────────────────────
export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (React.ReactNode | string)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.07] my-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.08] bg-[#0c0d10]">
            {headers.map((h) => (
              <th key={h} className="py-2.5 px-4 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
              {r.map((c, j) => (
                <td key={j} className="py-2.5 px-4 text-zinc-400 align-top">
                  {typeof c === "string" ? (j === 0 ? <span className="font-mono text-cyan-300 text-[13px]">{c}</span> : <span>{c}</span>) : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── PreviousNext: navigasi antar halaman ──────────────────────────
export function PreviousNext({
  prev,
  next,
}: {
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
  if (!prev && !next) return null;
  return (
    <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-14 pt-6 border-t border-white/[0.06]">
      {prev ? (
        <a
          href={prev.href}
          className="group flex flex-col gap-1 rounded-lg border border-white/[0.07] bg-[#0c0d10] px-4 py-3 hover:border-white/[0.14] transition-colors"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">← Sebelumnya</span>
          <span className="text-sm text-zinc-300 group-hover:text-cyan-300 transition-colors">{prev.label}</span>
        </a>
      ) : <div />}
      {next ? (
        <a
          href={next.href}
          className="group flex flex-col gap-1 items-end text-right rounded-lg border border-white/[0.07] bg-[#0c0d10] px-4 py-3 hover:border-white/[0.14] transition-colors"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">Selanjutnya →</span>
          <span className="text-sm text-zinc-300 group-hover:text-cyan-300 transition-colors">{next.label}</span>
        </a>
      ) : <div />}
    </nav>
  );
}
