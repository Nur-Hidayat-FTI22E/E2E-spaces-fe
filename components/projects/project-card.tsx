"use client";

import React from "react";
import Link from "next/link";
import { Project } from "@/types/project";
import { Card } from "@/components/ui/card";
import { FolderGit2, ArrowUpRight, ExternalLink, Trash2, Boxes } from "lucide-react";

const statusColor: Record<string, string> = {
  RUNNING: "text-emerald-400 border-emerald-500/30 bg-emerald-950/30",
  FAILED: "text-rose-400 border-rose-500/30 bg-rose-950/30",
  STOPPED: "text-zinc-400 border-zinc-600/40 bg-zinc-900/60",
  BUILDING: "text-amber-400 border-amber-500/30 bg-amber-950/30",
};

interface ProjectCardProps {
  project: Project;
  latestStatus?: string;
  deploymentUrl?: string;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({
  project,
  deploymentUrl,
  onDelete,
}: ProjectCardProps) {
  const formattedDate = new Date(project.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const services = project.services ?? [];

  return (
    <Card className="p-5 flex flex-col justify-between border-white/[0.07] bg-[#0c0d10] hover:border-white/[0.14] transition-all hover:shadow-[0_0_25px_-5px_rgba(0,210,255,0.05)] group">
      <div>
        {/* Top bar */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900/60 border border-white/[0.06] flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <Link
                href={`/workspace/projects/${project.id}`}
                className="text-sm font-semibold text-zinc-100 hover:text-cyan-400 transition-colors tracking-tight line-clamp-1"
              >
                {project.name}
              </Link>
              <p className="text-xs font-mono text-zinc-500">/{project.slug}</p>
            </div>
          </div>
        </div>

        {/* URL Preview or Services summary */}
        {deploymentUrl ? (
          <div className="mt-4 p-2 rounded bg-zinc-950/60 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 truncate">{deploymentUrl}</span>
            <a
              href={`https://${deploymentUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-cyan-400 p-1"
              title="Open Deployment URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-1.5">
            {services.length > 0 ? (
              <>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>
                    {services.length}{" "}
                    {services.length === 1 ? "Service" : "Services"}
                  </span>
                </div>
                {services.slice(0, 3).map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-zinc-950/60 border border-white/[0.06] text-[11px] font-mono"
                  >
                    <span className="text-zinc-300 truncate">{svc.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide flex-shrink-0 ${
                        statusColor[svc.status] ||
                        "text-zinc-400 border-zinc-600/40 bg-zinc-900/60"
                      }`}
                    >
                      {svc.status || "UNKNOWN"}
                    </span>
                  </div>
                ))}
                {services.length > 3 && (
                  <span className="text-[10px] text-zinc-600 font-mono pl-2">
                    +{services.length - 3} more
                  </span>
                )}
              </>
            ) : (
              <span className="px-2 py-0.5 rounded bg-zinc-900/60 border border-white/[0.06] text-[11px] text-zinc-500 font-mono w-fit">
                No services yet
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500">
        <span className="font-mono text-[11px]">Created {formattedDate}</span>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(project);
              }}
              className="text-zinc-600 hover:text-rose-400 p-1 rounded transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <Link
            href={`/workspace/projects/${project.id}`}
            className="text-zinc-400 hover:text-cyan-400 flex items-center gap-1 font-mono text-xs transition-colors"
          >
            <span>Inspect</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
