"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { DeploymentLog } from "@/types/deployment";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  Search,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  RefreshCw,
  Trash2,
  ArrowDown,
  Clock,
  X,
} from "lucide-react";

interface LogViewerProps {
  logs: DeploymentLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
  autoRefresh?: boolean;
  onToggleAutoRefresh?: (enabled: boolean) => void;
  className?: string;
  fillHeight?: boolean;
}

export function LogViewer({
  logs,
  isLoading = false,
  onRefresh,
  title = "Deployment Logs",
  subtitle = "Real-time build and execution telemetry",
  autoRefresh = false,
  onToggleAutoRefresh,
  className = "",
  fillHeight = false,
}: LogViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clearedLogs, setClearedLogs] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  // Filter logs based on search term, level filter, and cleared IDs
  const displayLogs = useMemo(() => {
    return logs.filter((log) => {
      if (clearedLogs.includes(log.id)) return false;
      if (selectedLevel !== "ALL" && log.level !== selectedLevel) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const messageMatch = log.message.toLowerCase().includes(query);
        const sourceMatch = log.source?.toLowerCase().includes(query);
        return messageMatch || sourceMatch;
      }
      return true;
    });
  }, [logs, clearedLogs, selectedLevel, searchTerm]);

  // Auto-scroll when new logs arrive if enabled
  useEffect(() => {
    if (autoScroll && terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [displayLogs, autoScroll]);

  // Detect user scroll up to pause auto-scroll
  const handleScroll = () => {
    if (!terminalBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalBodyRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (autoScroll !== isAtBottom) {
      setAutoScroll(isAtBottom);
    }
  };

  const scrollToBottom = () => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  const handleCopyLogs = async () => {
    if (displayLogs.length === 0) return;
    const text = displayLogs
      .map(
        (l) =>
          `[${new Date(l.created_at).toISOString()}] [${l.level}]${l.source ? ` [${l.source}]` : ""
          }: ${l.message}`
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    if (displayLogs.length === 0) return;
    const text = displayLogs
      .map(
        (l) =>
          `[${new Date(l.created_at).toISOString()}] [${l.level}]${l.source ? ` [${l.source}]` : ""
          }: ${l.message}`
      )
      .join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kospaces-deployment-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setClearedLogs(logs.map((l) => l.id));
  };

  const handleResetClear = () => {
    setClearedLogs([]);
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case "ERROR":
        return "bg-rose-950/80 text-rose-400 border border-rose-800/60";
      case "WARN":
        return "bg-zinc-900 text-zinc-300 border border-zinc-750";
      case "DEBUG":
        return "bg-zinc-900 text-zinc-400 border border-zinc-800";
      case "INFO":
      default:
        return "bg-cyan-950/80 text-cyan-300 border border-cyan-800/60";
    }
  };

  const getSourceBadgeClass = (source?: string) => {
    switch (source?.toLowerCase()) {
      case "engine":
        return "text-cyan-400 bg-cyan-950/40 border-cyan-800/40";
      case "build":
        return "text-zinc-400 bg-zinc-900 border-zinc-750";
      case "runtime":
        return "text-emerald-400 bg-emerald-950/50 border-emerald-800/50";
      default:
        return "text-zinc-400 bg-zinc-900 border-zinc-800";
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-cyan-500/30 text-cyan-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-xl border border-zinc-800 bg-[#030304] overflow-hidden flex flex-col transition-all duration-200 ${isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none h-screen w-screen"
          : fillHeight
            ? "w-full flex-1 min-h-0 shadow-2xl"
            : "w-full shadow-2xl"
        } ${className}`}
    >
      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-zinc-950/90 border-b border-zinc-850 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-300">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white font-mono">{title}</span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Live Polling Status Indicator */}
          {onToggleAutoRefresh ? (
            <button
              onClick={() => onToggleAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors cursor-pointer ${autoRefresh
                  ? "bg-cyan-950/50 text-cyan-400 border-cyan-800/60"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}
              title="Toggle Live Stream Polling"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"
                  }`}
              />
              {autoRefresh ? "LIVE POLLING" : "STREAM PAUSED"}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>TELEMETRY</span>
            </div>
          )}

          <span className="text-[11px] font-mono text-zinc-500 hidden md:inline">
            {displayLogs.length} / {logs.length} lines
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs font-mono bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 w-32 sm:w-44 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-zinc-500 hover:text-zinc-300 absolute right-2 cursor-pointer p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Level Filter Selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {["ALL", "INFO", "WARN", "ERROR"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${selectedLevel === lvl
                    ? "bg-zinc-800 text-cyan-300 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                  }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
              title="Refresh logs"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}

          {/* Copy Logs */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLogs}
            disabled={displayLogs.length === 0}
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
          </Button>

          {/* Download Logs */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadLogs}
            disabled={displayLogs.length === 0}
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
            title="Download .log file"
          >
            <Download className="w-3 h-3" />
          </Button>

          {/* Clear Buffer */}
          {clearedLogs.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetClear}
              className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 border-amber-800/40"
              title="Restore cleared logs"
            >
              Restore ({clearedLogs.length})
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={displayLogs.length === 0}
              className="h-7 px-2 text-xs text-zinc-400 hover:text-rose-400"
              title="Clear current view"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}

          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Terminal View Body */}
      <div
        ref={terminalBodyRef}
        onScroll={handleScroll}
        className={`bg-[#030304] font-mono text-xs text-zinc-300 p-4 overflow-y-auto overscroll-contain relative select-text ${
          isFullscreen || fillHeight ? "flex-1 min-h-0" : "min-h-[380px] max-h-[620px]"
        }`}
      >
        {displayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-zinc-600 gap-2 font-mono">
            <Terminal className="w-8 h-8 text-zinc-700 mb-1" />
            <span className="text-xs">
              {logs.length === 0
                ? "Waiting for deployment execution logs..."
                : "No log lines matching query / filters."}
            </span>
            <span className="text-[10px] text-zinc-700">
              kospaces:~$ awaiting telemetry stream
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {displayLogs.map((log, index) => (
              <div
                key={log.id || index}
                className="group flex items-start gap-2.5 leading-relaxed hover:bg-zinc-900/40 px-1.5 py-0.5 rounded transition-colors"
              >
                {/* Line number */}
                <span className="text-zinc-700 text-[10px] select-none w-8 text-right font-mono flex-shrink-0 pt-0.5">
                  {String(index + 1).padStart(3, "0")}
                </span>

                {/* Timestamp */}
                <span className="text-zinc-600 text-[10px] select-none flex-shrink-0 pt-0.5 font-mono">
                  [{new Date(log.created_at).toLocaleTimeString()}]
                </span>

                {/* Level Badge */}
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded select-none flex-shrink-0 font-mono uppercase ${getLevelBadgeClass(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>

                {/* Source Tag if present */}
                {log.source && (
                  <span
                    className={`text-[9px] font-bold font-mono uppercase px-1 rounded select-none border flex-shrink-0 ${getSourceBadgeClass(
                      log.source
                    )}`}
                  >
                    {log.source}
                  </span>
                )}

                {/* Message */}
                <span className="text-zinc-200 text-xs break-all flex-1 whitespace-pre-wrap font-mono">
                  {highlightMatch(log.message, searchTerm)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Auto-scroll paused float indicator */}
        {!autoScroll && displayLogs.length > 0 && (
          <div className="sticky bottom-2 flex justify-center w-full pointer-events-none mt-4">
            <button
              onClick={scrollToBottom}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 text-cyan-400 border border-cyan-800/80 shadow-xl backdrop-blur text-xs font-mono hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              <span>Scroll to Bottom</span>
            </button>
          </div>
        )}
      </div>

      {/* Terminal Footer Bar */}
      <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-850 flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-zinc-600" />
          <span>{subtitle}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Buffer: {displayLogs.length} events</span>
          <span className="text-zinc-700">|</span>
          <span className={autoScroll ? "text-cyan-400" : "text-zinc-500"}>
            {autoScroll ? "Auto-scroll: ON" : "Auto-scroll: PAUSED"}
          </span>
        </div>
      </div>
    </div>
  );
}
