"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Deployment } from "@/types/deployment";
import { cleanRepoUrl } from "@/lib/git";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/projects/project-status";
import { isCustomDomainName, platformServiceHost } from "@/lib/platform";
import {
  FolderGit2,
  Boxes,
  Upload,
  ExternalLink,
  ArrowUpRight,
  Play,
  Square,
  Copy,
  Check,
  GitCommit,
} from "lucide-react";

interface DeploymentCardProps {
  deployment: Deployment;
  projectName?: string;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
}

export function DeploymentCard({
  deployment,
  projectName,
  onStart,
  onStop,
}: DeploymentCardProps) {
  const [copied, setCopied] = useState(false);

  const copyId = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(deployment.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = () => {
    switch (deployment.type) {
      case "GIT":
        return <FolderGit2 className="w-4 h-4 text-cyan-400" />;
      case "DOCKER":
        return <Boxes className="w-4 h-4 text-indigo-400" />;
      case "LOCAL":
      default:
        return <Upload className="w-4 h-4 text-amber-400" />;
    }
  };

  const formattedDate = new Date(deployment.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isCustomSubdomain = isCustomDomainName(deployment.subdomain);
  const deploymentDomainDisplay = platformServiceHost(deployment.subdomain);
  const url = deployment.subdomain
    ? `https://${deploymentDomainDisplay}`
    : null;

  return (
    <Card className="p-4 hover:border-zinc-750 transition-all hover:shadow-[0_0_20px_-5px_rgba(0,210,255,0.06)] group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left info */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-100 font-mono">
                {deployment.type}
              </span>
              <ProjectStatusBadge status={deployment.status} />
              {deployment.commit_sha && (
                <a
                  href={
                    deployment.repository_url && deployment.repository_url.includes("github.com")
                      ? `${deployment.repository_url.replace(/\.git$/, "")}/commit/${deployment.commit_sha}`
                      : undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 hover:text-cyan-200 hover:border-cyan-500/60 transition-colors"
                  title={`View commit on GitHub: ${deployment.commit_sha}`}
                >
                  <GitCommit className="w-3 h-3 text-cyan-400" />
                  <span>{deployment.commit_sha.slice(0, 7)}</span>
                </a>
              )}
              {projectName && (
                <span className="text-xs text-zinc-500 font-mono">• {projectName}</span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-mono text-zinc-300 truncate max-w-md">
                {deployment.repository_url
                  ? `${cleanRepoUrl(deployment.repository_url)} (${deployment.branch || "main"})`
                  : deployment.docker_image
                  ? deployment.docker_image
                  : `Archive: ${deployment.subdomain}.zip`}
              </span>

              {deployment.commit_message && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-[11px] font-mono text-zinc-400 truncate max-w-xs sm:max-w-md" title={deployment.commit_message}>
                    {deployment.commit_message}
                  </span>
                </>
              )}

              <button
                onClick={copyId}
                className="text-zinc-600 hover:text-zinc-300 p-0.5 transition-colors"
                title="Copy Deployment UUID"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Ports & Allocations */}
            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-zinc-500">
              <span>Port: :{deployment.container_port}</span>
              {deployment.host_port && <span>Host: :{deployment.host_port}</span>}
              <span>RAM: {deployment.memory_mb}MB</span>
              <span>CPU: {deployment.cpus}</span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
          <span className="text-xs font-mono text-zinc-500">{formattedDate}</span>

          <div className="flex items-center gap-2">
            {url && deployment.status === "RUNNING" && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-cyan-400 p-1.5 rounded transition-colors"
                title="Visit Live Deployment"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {onStart && deployment.status === "STOPPED" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStart(deployment.id)}
                className="text-xs text-cyan-400 hover:text-cyan-300 px-2 h-7"
              >
                <Play className="w-3 h-3 mr-1" /> Start
              </Button>
            )}

            {onStop && deployment.status === "RUNNING" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStop(deployment.id)}
                className="text-xs text-rose-400 hover:text-rose-300 px-2 h-7"
              >
                <Square className="w-3 h-3 mr-1" /> Stop
              </Button>
            )}

            <Link href={`/workspace/deployments/${deployment.id}`}>
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ArrowUpRight className="w-3 h-3 text-zinc-400" />}
                className="text-xs px-2.5 h-7"
              >
                Inspect
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
