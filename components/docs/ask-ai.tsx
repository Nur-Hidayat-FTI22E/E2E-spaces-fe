"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

interface AIProvider {
  id: string;
  name: string;
  desc: string;
  tag?: string;
  /** Bangun URL redirect dengan prompt yang berisi konteks halaman */
  buildUrl?: (prompt: string) => string;
}

const MAX_PROMPT = 2000; // potong prompt agar tidak kelewat tanpa truncation provider

export const PROVIDERS: AIProvider[] = [
  {
    id: "claude",
    name: "Claude",
    desc: "Anthropic — Claude mempelajari halaman ini",
    buildUrl: (p) =>
      `https://claude.ai/new?q=${encodeURIComponent(p)}`,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    desc: "OpenAI — GPT akan membaca URL",
    buildUrl: (p) =>
      `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    desc: " copilot.microsoft.com akan membaca URL",
    buildUrl: (p) =>
      `https://copilot.microsoft.com/?q=${encodeURIComponent(p)}`,
  },
  {
    id: "gemini",
    name: "Gemini",
    desc: "Google — Gemini membaca URL dari prompt",
    buildUrl: (p) =>
      `https://gemini.google.com/app?prompt=${encodeURIComponent(p)}`,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    desc: "Search-first, menyebut dokumen URL",
    buildUrl: (p) =>
      `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}`,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  pageTitle: string;
  pageHref: string; // absolute URL utk fetch oleh AI
  pageContent?: string; // fallback ringkas bila AI tak bisa fetch URL
}

export function AskAI({ open, onClose, pageTitle, pageHref, pageContent }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const prompt = buildPrompt(pageTitle, pageHref, pageContent);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-x-0 top-0 mx-auto max-w-md sm:top-16 rounded-b-xl border border-white/[0.08] bg-[#060608] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
          <div>
            <p className="text-sm font-semibold text-white">Ask AI about this page</p>
            <p className="text-[11px] text-zinc-500 truncate max-w-xs">
              {pageTitle} · {pageHref}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-white/[0.05] text-zinc-400 hover:text-white transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ringkasan prompt (preview) */}
        <div className="px-4 pt-3">
          <div className="rounded-lg border border-white/[0.07] bg-[#0a0b0e] p-3 relative group">
            <button
              onClick={copyPrompt}
              className="absolute top-2 right-2 p-1.5 rounded-md border border-white/[0.08] bg-[#141417]/90 text-zinc-500 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors opacity-0 group-hover:opacity-100 max-sm:opacity-100"
              aria-label="Copy prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <p className="text-[11px] font-mono text-zinc-500 leading-relaxed pr-10 max-h-32 overflow-hidden">
              {prompt.length > 320 ? prompt.slice(0, 320) + "…" : prompt}
            </p>
          </div>
        </div>

        {/* Pilihan provider */}
        <div className="px-4 py-3 space-y-2 max-h-[50vh] overflow-y-auto">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 px-1">
            Pilih AI untuk membantu
          </p>
          {PROVIDERS.map((p) => (
            <a
              key={p.id}
              href={p.buildUrl?.(prompt) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="group flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#0c0d10] px-4 py-3 hover:border-cyan-500/30 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                  {p.name}
                </p>
                <p className="text-[11px] text-zinc-500">{p.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-300 transition-colors" />
            </a>
          ))}

          {PROVIDERS.every((p) => !p.buildUrl) && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
              Tidak ada provider yang mendukung prefill URL di browser ini.
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Prompt berisi link ke halaman docs + inti konten, sehingga AI yang kamu pilih bisa
            membacanya langsung. Jika link belum ter-index, AI tetap menjawab dari kutipan
            yang disertakan.
          </p>
        </div>
      </aside>
    </div>
  );
}

// Bangun prompt yang dikirim ke AI (di-encode sebagai parameter URL per provider).
// Formulasi ala Railway: "Read this documentation page: <url>"
// + konten kutipan sebagai jaring pengaman.
export function buildPrompt(
  pageTitle: string,
  pageHref: string,
  pageContent?: string
): string {
  const excerpt = (pageContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PROMPT);

  const head =
    "Read this documentation page and answer questions about it in Bahasa Indonesia:\n" +
    `${pageTitle}\n` +
    `${pageHref}\n`;

  const sec = excerpt ? `\n\nPage content (excerpt):\n"""\n${excerpt}\n"""` : "";
  const tail =
    "\n\nPengguna akan bertanya tentang halaman ini — jawab langsung, ringkas, dan sertakan langkah konkret bila relevan.";

  return (head + sec + tail).slice(0, MAX_PROMPT + 600);
}

// Presisi tombol Ask AI (untuk sidebar & topbar).
export function AskAIButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c0d10] px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors"
    >
      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
      Ask AI
    </button>
  );
}
