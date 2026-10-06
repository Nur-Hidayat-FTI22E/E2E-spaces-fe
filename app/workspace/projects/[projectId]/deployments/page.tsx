"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { DeploymentCard } from "@/components/deployments/deployment-card";
import { Button } from "@/components/ui/button";
import { getProjectApi, getProjectDeploymentsApi } from "@/lib/api/projects";
import { startDeploymentApi, stopDeploymentApi } from "@/lib/api/deployments";
import { Project } from "@/types/project";
import { Deployment } from "@/types/deployment";
import {
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowLeft,
} from "lucide-react";

export default function ProjectDeploymentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [proj, deps] = await Promise.all([
          getProjectApi(projectId),
          getProjectDeploymentsApi(projectId),
        ]);

        if (!isMounted) return;
        setProject(proj);
        setDeployments(deps.deployments || []);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load deployments";
          setError(msg);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const deps = await getProjectDeploymentsApi(projectId);
      setDeployments(deps.deployments || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reload deployments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await startDeploymentApi(id);
      await handleRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start container");
    }
  };

  const handleStop = async (id: string) => {
    try {
      await stopDeploymentApi(id);
      await handleRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to stop container");
    }
  };

  const filteredDeployments = deployments.filter((d) => {
    if (statusFilter === "ALL") return true;
    return d.status === statusFilter;
  });

  return (
    <DashboardShell
      title="Projects"
      subtitle={project ? `${project.name} / Deployments` : "Deployments"}
      showCreateButton={false}
    >
      <div className="flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-850">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/workspace/projects/${projectId}`}
                className="text-xs text-zinc-500 hover:text-cyan-400 flex items-center gap-1 font-mono transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Project</span>
              </Link>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-1">
              Deployments
            </h2>
            <p className="text-xs text-zinc-400">
              Audit and inspect all pipeline execution runs for this project.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Sync
            </Button>

            <Link href="/workspace/projects/new">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                New Deployment
              </Button>
            </Link>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["ALL", "RUNNING", "BUILDING", "QUEUED", "FAILED", "STOPPED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === status
                  ? "bg-zinc-800 text-cyan-300 font-semibold border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-zinc-850 bg-zinc-950/40 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs font-mono text-zinc-500">
              Loading deployment records...
            </span>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="p-6 rounded-xl border border-rose-900/50 bg-rose-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && deployments.length === 0 && (
          <div className="p-16 rounded-xl border border-zinc-800/80 bg-zinc-950/40 text-center flex flex-col items-center gap-3">
            <Clock className="w-10 h-10 text-zinc-600" />
            <h3 className="text-sm font-semibold text-white">No deployments found</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Trigger your first deployment to build and launch an isolated container.
            </p>
            <Link href="/workspace/projects/new" className="mt-2">
              <Button variant="primary" size="sm" className="font-semibold text-xs">
                Launch First Deployment
              </Button>
            </Link>
          </div>
        )}

        {/* Filter returned 0 */}
        {!isLoading && !error && deployments.length > 0 && filteredDeployments.length === 0 && (
          <div className="p-12 rounded-xl border border-zinc-850 bg-zinc-950/30 text-center">
            <p className="text-xs text-zinc-400 font-mono">
              No deployments with status &ldquo;{statusFilter}&rdquo;
            </p>
          </div>
        )}

        {/* Deployments List */}
        {!isLoading && !error && filteredDeployments.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredDeployments.map((dep) => (
              <DeploymentCard
                key={dep.id}
                deployment={dep}
                projectName={project?.name}
                onStart={handleStart}
                onStop={handleStop}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
