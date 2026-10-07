"use client";

import React from "react";
import Link from "next/link";
import { Service } from "@/types/service";
import {
  cleanRepoUrl,
  getRepoDisplayName,
  fetchLatestCommit,
  CommitInfo,
} from "@/lib/git";
import { Card } from "@/components/ui/card";
import { isCustomDomainName, platformServiceHost } from "@/lib/platform";
import { ServiceIcon } from "@/components/services/service-icon";
import {
  Server,
  Globe,
  Database,
  Boxes,
  ExternalLink,
  Play,
  RotateCw,
  Square,
  Trash2,
  Cpu,
  HardDrive,
  GitBranch,
  GitCommit,
} from "lucide-react";

interface ServiceCardProps {
  service: Service;
  projectId: string;
  onDeploy?: (service: Service) => void;
  onRestart?: (service: Service) => void;
  onStop?: (service: Service) => void;
  onDelete?: (service: Service) => void;
}

export function ServiceCard({
  service,
  projectId,
  onDeploy,
  onRestart,
  onStop,
  onDelete,
}: ServiceCardProps) {
  const [commit, setCommit] = React.useState<CommitInfo | null>(null);
  const [isLoadingCommit, setIsLoadingCommit] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    if (service.source_type === "GIT" && service.repository_url) {
      setIsLoadingCommit(true);
      fetchLatestCommit(service.repository_url, service.branch)
        .then((info) => {
          if (isMounted) {
            setCommit(info);
            setIsLoadingCommit(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingCommit(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [service.source_type, service.repository_url, service.branch]);

  // Status styling
  const statusConfig = {
    RUNNING: {
      color: "text-emerald-400 border-emerald-800/40 bg-emerald-950/40",
      dot: "bg-emerald-400 animate-pulse",
      label: "RUNNING",
    },
    BUILDING: {
      color: "text-amber-400 border-amber-800/40 bg-amber-950/40",
      dot: "bg-amber-400 animate-pulse",
      label: "BUILDING",
    },
    DEPLOYING: {
      color: "text-cyan-400 border-cyan-800/40 bg-cyan-950/40",
      dot: "bg-cyan-400 animate-pulse",
      label: "DEPLOYING",
    },
    STOPPED: {
      color: "text-zinc-400 border-zinc-800 bg-zinc-900/60",
      dot: "bg-zinc-500",
      label: "STOPPED",
    },
    FAILED: {
      color: "text-rose-400 border-rose-800/40 bg-rose-950/40",
      dot: "bg-rose-400",
      label: "FAILED",
    },
    IDLE: {
      color: "text-zinc-400 border-zinc-800 bg-zinc-900/40",
      dot: "bg-zinc-500",
      label: "IDLE",
    },
  }[service.status] || {
    color: "text-zinc-400 border-zinc-800 bg-zinc-900/40",
    dot: "bg-zinc-500",
    label: service.status,
  };

  const isCustomDomain = isCustomDomainName(service.subdomain);
  const serviceDomainDisplay = platformServiceHost(service.subdomain);
  const serviceUrl = service.subdomain
    ? `https://${serviceDomainDisplay}`
    : null;

  return (
    <Card className="p-5 border-white/[0.07] bg-[#0c0d10] hover:border-white/[0.14] transition-all hover:shadow-[0_0_25px_-5px_rgba(0,210,255,0.05)] flex flex-col justify-between group overflow-hidden">
      <div>
        {/* Top bar: Icon, Name, Type, Status */}
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-zinc-900/60 border border-white/[0.06] flex items-center justify-center shrink-0">
              <ServiceIcon service={service} className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/workspace/projects/${projectId}/services/${service.id}`}
                className="text-sm font-bold text-zinc-100 hover:text-cyan-400 transition-colors tracking-tight flex items-center gap-1.5 truncate"
              >
                <span className="truncate">{service.name}</span>
              </Link>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0 w-full">
                {service.source_type === "GIT" ? (
                  commit ? (
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 hover:text-cyan-300 transition-colors min-w-0 max-w-full"
                      title={`Commit ${commit.shortSha}: ${commit.message}`}
                    >
                      <GitCommit className="w-3 h-3 text-cyan-400/80 shrink-0" />
                      <span className="text-zinc-300 font-semibold shrink-0">{commit.shortSha}</span>
                      <span className="text-zinc-600 shrink-0">•</span>
                      <span className="truncate">{commit.message}</span>
                    </a>
                  ) : isLoadingCommit ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 animate-pulse min-w-0">
                      <GitCommit className="w-3 h-3 text-zinc-600 shrink-0" />
                      <span className="truncate">fetching commit...</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 truncate min-w-0">
                      <GitCommit className="w-3 h-3 text-zinc-600 shrink-0" />
                      <span className="truncate">{service.branch || "main"}</span>
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500">
                    :{service.container_port}
                  </span>
                )}
              </div>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${statusConfig.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dot}`} />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* Source info (Git repo or Docker image) */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-col gap-1.5">
          {service.source_type === "GIT" && service.repository_url && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
              <GitBranch className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
              <a
                href={cleanRepoUrl(service.repository_url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-[11px] text-zinc-300 hover:text-cyan-400 hover:underline truncate transition-colors"
                title={cleanRepoUrl(service.repository_url)}
              >
                {getRepoDisplayName(service.repository_url)}
              </a>
              <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">
                ({service.branch || "main"})
              </span>
            </div>
          )}

          {service.source_type === "DOCKER" && service.docker_image && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
              <Boxes className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
              <span className="font-mono text-[11px] text-zinc-300 truncate">
                {service.docker_image}
              </span>
            </div>
          )}

          {serviceUrl && service.status === "RUNNING" && (
            <div className="flex items-center justify-between mt-1 pt-1 text-xs">
              <a
                href={serviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-cyan-400/90 hover:text-cyan-300 font-mono transition-colors truncate"
              >
                <span className="truncate">{serviceDomainDisplay}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Resources indicator */}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            <span>{service.memory_mb}MB</span>
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            <span>{service.cpus} CPU</span>
          </div>
          {service.host_port && (
            <span className="ml-auto text-[10px] text-zinc-600">
              Host: {service.host_port}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Quick Controls */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <Link
          href={`/workspace/projects/${projectId}/services/${service.id}`}
          className="text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          View Details →
        </Link>

        <div className="flex items-center gap-1">
          {onRestart && (
            <button
              onClick={() => onRestart(service)}
              title="Restart Container"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {onStop && service.status === "RUNNING" && (
            <button
              onClick={() => onStop(service)}
              title="Stop Container"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}

          {onDeploy && (
            <button
              onClick={() => onDeploy(service)}
              title="Trigger Deploy"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(service)}
              title="Delete Service"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
