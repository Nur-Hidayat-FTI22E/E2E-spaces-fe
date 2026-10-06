"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/projects/project-status";
import { DeploymentTimeline } from "@/components/deployments/deployment-timeline";
import { LifecycleControls } from "@/components/deployments/lifecycle-controls";
import { LogViewer } from "@/components/logs/log-viewer";
import { getDeploymentApi, getDeploymentLogsApi } from "@/lib/api/deployments";
import { Deployment, DeploymentLog, DeploymentStatus } from "@/types/deployment";
import { cleanRepoUrl } from "@/lib/git";
import { DeploymentDetailSkeleton } from "@/components/ui/skeleton";
import {
  FolderGit2,
  Boxes,
  Upload,
  ExternalLink,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";

export default function DeploymentDetailPage({
  params,
}: {
  params: Promise<{ deploymentId: string }>;
}) {
  const resolvedParams = use(params);
  const deploymentId = resolvedParams.deploymentId;
  const router = useRouter();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [copied, setCopied] = useState(false);
  const [showEnvSecrets, setShowEnvSecrets] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        const dep = await getDeploymentApi(deploymentId);
        if (!isMounted) return;
        setDeployment(dep);

        const logsRes = await getDeploymentLogsApi(deploymentId, undefined, 200).catch(() => ({
          logs: [],
          total: 0,
        }));
        if (!isMounted) return;
        setLogs(logsRes.logs || []);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load deployment details");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [deploymentId]);

  // Real-time polling
  useEffect(() => {
    if (!autoRefresh || !deployment) return;

    const activeStatuses: DeploymentStatus[] = [
      "QUEUED",
      "BUILDING",
      "DEPLOYING",
      "RUNNING",
    ];

    // Poll aggressively (2.5s) if active, or slower (10s) if stopped/failed
    const pollInterval = activeStatuses.includes(deployment.status) ? 2500 : 10000;

    const interval = setInterval(async () => {
      try {
        const [updatedDep, logsRes] = await Promise.all([
          getDeploymentApi(deploymentId),
          getDeploymentLogsApi(deploymentId, undefined, 2000).catch(() => ({
            logs: [],
            total: 0,
          })),
        ]);
        setDeployment(updatedDep);
        setLogs(logsRes.logs || []);
      } catch {
        // Polling failed silently
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [deployment, deploymentId, autoRefresh]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [updatedDep, logsRes] = await Promise.all([
        getDeploymentApi(deploymentId),
        getDeploymentLogsApi(deploymentId, undefined, 2000).catch(() => ({
          logs: [],
          total: 0,
        })),
      ]);
      setDeployment(updatedDep);
      setLogs(logsRes.logs || []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to refresh deployment");
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyDeploymentId = () => {
    navigator.clipboard.writeText(deploymentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <DashboardShell title="Deployment Details">
        <DeploymentDetailSkeleton />
      </DashboardShell>
    );
  }

  if (error || !deployment) {
    return (
      <DashboardShell title="Deployments" subtitle="Error">
        <div className="p-8 rounded-xl border border-rose-900/50 bg-rose-950/20 text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <h3 className="text-sm font-semibold text-white">Deployment Not Found</h3>
          <p className="text-xs text-zinc-400">{error || "Unable to retrieve deployment."}</p>
          <Link href="/workspace/projects">
            <Button variant="outline" size="sm" className="text-xs">
              &larr; Return to Workspace
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const liveUrl = deployment.subdomain
    ? `https://${deployment.subdomain}-spaces.kotacloud.com`
    : null;

  return (
    <DashboardShell title="Deployments" subtitle={deployment.id.slice(0, 8)} showCreateButton={false}>
      <div className="flex flex-col gap-6">
        {/* Back Link */}
        {deployment.project_id && (
          <div>
            <Link
              href={`/workspace/projects/${deployment.project_id}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Project</span>
            </Link>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-850">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
              {deployment.type === "GIT" && <FolderGit2 className="w-5 h-5 text-cyan-400" />}
              {deployment.type === "DOCKER" && <Boxes className="w-5 h-5 text-indigo-400" />}
              {deployment.type === "LOCAL" && <Upload className="w-5 h-5 text-amber-400" />}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white font-mono">
                  Deployment {deployment.id.slice(0, 8)}
                </h2>
                <ProjectStatusBadge status={deployment.status} />
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs font-mono text-zinc-400">
                <button
                  onClick={copyDeploymentId}
                  className="hover:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-zinc-500">ID:</span>
                  <span>{deployment.id}</span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </button>

                {liveUrl && (
                  <>
                    <span>•</span>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>{deployment.subdomain}-spaces.kotacloud.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Sync
            </Button>

            {/* Container Lifecycle Controls */}
            <LifecycleControls
              deploymentId={deployment.id}
              status={deployment.status}
              onActionComplete={handleRefresh}
              onRemoveComplete={() => {
                if (deployment.project_id) {
                  router.push(`/workspace/projects/${deployment.project_id}`);
                } else {
                  router.push("/workspace/projects");
                }
              }}
            />
          </div>
        </div>

        {/* Visual Deployment Timeline */}
        <DeploymentTimeline
          status={deployment.status}
          createdAt={deployment.created_at}
          updatedAt={deployment.updated_at}
        />

        {/* Two Column Layout: Specs & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Specifications (1 col) */}
          <div className="flex flex-col gap-6">
            {/* Runtime Specs */}
            <Card>
              <CardHeader>
                <CardTitle>Runtime Allocation</CardTitle>
                <CardDescription>Container resources & port mapping</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850 font-mono">
                  <span className="text-zinc-400">Deployment Type</span>
                  <span className="font-semibold text-zinc-200">{deployment.type}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850 font-mono">
                  <span className="text-zinc-400">Container Port</span>
                  <span className="text-cyan-400 font-semibold">:{deployment.container_port}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850 font-mono">
                  <span className="text-zinc-400">Host Port</span>
                  <span className="text-zinc-200">:{deployment.host_port || "Dynamic"}</span>
                </div>

                {deployment.public_port && (
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-850 font-mono">
                    <span className="text-zinc-400">Public Port</span>
                    <span className="text-zinc-200">:{deployment.public_port}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850 font-mono">
                  <span className="text-zinc-400">Memory Limit</span>
                  <span className="text-zinc-200">{deployment.memory_mb} MB</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850 font-mono">
                  <span className="text-zinc-400">CPU Allocation</span>
                  <span className="text-zinc-200">{deployment.cpus} Cores</span>
                </div>

                <div className="flex items-center justify-between py-1.5 font-mono">
                  <span className="text-zinc-400">Created At</span>
                  <span className="text-zinc-500 text-[11px]">
                    {new Date(deployment.created_at).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Source Details */}
            <Card>
              <CardHeader>
                <CardTitle>Source Target</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 text-xs">
                {deployment.repository_url && (
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 font-mono text-[11px]">Repository</span>
                    <span className="font-mono text-zinc-200 break-all bg-zinc-900/50 p-2 rounded border border-zinc-850">
                      {cleanRepoUrl(deployment.repository_url)}
                    </span>
                  </div>
                )}

                {deployment.branch && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-850 font-mono">
                    <span className="text-zinc-500">Branch</span>
                    <span className="text-cyan-400 font-semibold">{deployment.branch}</span>
                  </div>
                )}

                {deployment.docker_image && (
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 font-mono text-[11px]">Docker Image</span>
                    <span className="font-mono text-zinc-200 break-all bg-zinc-900/50 p-2 rounded border border-zinc-850">
                      {deployment.docker_image}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Environment Variables Card */}
            {deployment.env_vars && Object.keys(deployment.env_vars).length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle>Environment Variables</CardTitle>
                    <button
                      onClick={() => setShowEnvSecrets(!showEnvSecrets)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 font-mono cursor-pointer"
                    >
                      {showEnvSecrets ? (
                        <>
                          <EyeOff className="w-3 h-3" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> Reveal
                        </>
                      )}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {Object.entries(deployment.env_vars).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-2 rounded bg-zinc-900/60 border border-zinc-850 flex items-center justify-between font-mono text-xs"
                    >
                      <span className="text-zinc-300 font-semibold">{key}</span>
                      <span className="text-zinc-500">
                        {showEnvSecrets ? value : "••••••••••••"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Full Featured Terminal Log Viewer (2 cols) */}
          <div className="lg:col-span-2">
            <LogViewer
              logs={logs}
              isLoading={isRefreshing}
              onRefresh={handleRefresh}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={setAutoRefresh}
              title={`Deployment ${deployment.id.slice(0, 8)} Telemetry`}
              subtitle="Execution plane container logs & pipeline events"
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
