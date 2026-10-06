"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ServiceCard } from "@/components/services/service-card";
import { CreateServiceModal } from "@/components/services/create-service-modal";
import { EnvEditor } from "@/components/settings/env-editor";
import {
  getProjectApi,
  updateProjectApi,
  deleteProjectApi,
  getProjectDomainsApi,
} from "@/lib/api/projects";
import {
  listProjectServicesApi,
  deployServiceApi,
  restartServiceApi,
  stopServiceApi,
  deleteServiceApi,
} from "@/lib/api/services";
import { Project } from "@/types/project";
import { Service } from "@/types/service";
import { Domain } from "@/types/domain";
import { useToast } from "@/lib/toast/toast-context";
import { ProjectCanvasSkeleton } from "@/components/ui/skeleton";
import {
  Boxes,
  Plus,
  ArrowLeft,
  Settings,
  Layers,
  Search,
  RotateCw,
  Trash2,
  AlertCircle,
  Loader2,
  Globe,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const router = useRouter();
  const toast = useToast();

  // Active tab: "services" | "domains" | "variables" | "settings"
  const [activeTab, setActiveTab] = useState<string>("services");

  // Data state
  const [project, setProject] = useState<Project | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"git" | "database" | "docker">("git");
  const [modalInitialType, setModalInitialType] = useState<"WEB" | "FRONTEND">("WEB");

  const openCreateService = (
    tab: "git" | "database" | "docker" = "git",
    type: "WEB" | "FRONTEND" = "WEB"
  ) => {
    setModalInitialTab(tab);
    setModalInitialType(type);
    setIsCreateServiceOpen(true);
  };

  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Settings tab state
  const [editName, setEditName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Shared variables
  const [sharedEnvVars, setSharedEnvVars] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`kospaces_shared_env_${projectId}`);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return {};
  });
  const [isSavingEnv, setIsSavingEnv] = useState(false);

  const fetchProjectAndServices = async () => {
    try {
      const [projData, servicesData, domsData] = await Promise.all([
        getProjectApi(projectId),
        listProjectServicesApi(projectId).catch(() => ({ services: [], total: 0 })),
        getProjectDomainsApi(projectId).catch(() => ({ domains: [], total: 0 })),
      ]);

      setProject(projData);
      setEditName(projData.name);
      setServices(servicesData.services || []);
      setDomains(domsData.domains || []);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load project details";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProjectAndServices();
    // keep spinner visible briefly so the animation feels intentional
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [projData, servicesData, domsData] = await Promise.all([
          getProjectApi(projectId),
          listProjectServicesApi(projectId).catch(() => ({ services: [], total: 0 })),
          getProjectDomainsApi(projectId).catch(() => ({ domains: [], total: 0 })),
        ]);
        if (isMounted) {
          setProject(projData);
          setEditName(projData.name);
          setServices(servicesData.services || []);
          setDomains(domsData.domains || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load project details";
          setError(msg);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [projectId]);

  // Handle service deployment
  const handleDeployService = async (service: Service) => {
    try {
      toast.info("Deploying", {
        message: `Triggering build for service ${service.name}...`,
      });
      await deployServiceApi(service.id);
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, status: "BUILDING" } : s))
      );
      toast.success("Deployment Queued", {
        message: `Service ${service.name} is building.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger deployment";
      toast.error("Deploy Failed", { message: msg });
    }
  };

  // Handle service restart
  const handleRestartService = async (service: Service) => {
    try {
      await restartServiceApi(service.id);
      toast.success("Restarted", {
        message: `Container for ${service.name} restarted.`,
      });
      fetchProjectAndServices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to restart service";
      toast.error("Restart Failed", { message: msg });
    }
  };

  // Handle service stop
  const handleStopService = async (service: Service) => {
    try {
      await stopServiceApi(service.id);
      toast.success("Stopped", {
        message: `Container for ${service.name} stopped.`,
      });
      fetchProjectAndServices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to stop service";
      toast.error("Stop Failed", { message: msg });
    }
  };

  // Handle delete service confirmation
  const handleDeleteServiceConfirm = async () => {
    if (!serviceToDelete) return;
    setIsDeletingService(true);
    try {
      await deleteServiceApi(serviceToDelete.id);
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      toast.success("Service Deleted", {
        message: `Service "${serviceToDelete.name}" was removed.`,
      });
      setServiceToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete service";
      toast.error("Error", { message: msg });
    } finally {
      setIsDeletingService(false);
    }
  };

  // Handle update project name
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !project) return;
    setIsUpdatingName(true);
    try {
      const updated = await updateProjectApi(project.id, { name: editName.trim() });
      setProject(updated);
      toast.success("Updated", { message: "Project name saved." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update project name";
      toast.error("Error", { message: msg });
    } finally {
      setIsUpdatingName(false);
    }
  };

  // Handle delete project confirmation
  const handleDeleteProjectConfirm = async () => {
    if (!project) return;
    setIsDeletingProject(true);
    try {
      await deleteProjectApi(project.id);
      toast.success("Project Deleted", {
        message: `Project "${project.name}" has been removed.`,
      });
      router.push("/workspace/projects");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete project";
      toast.error("Error", { message: msg });
      setIsDeletingProject(false);
    }
  };

  // Filtered services
  const filteredServices = services.filter((svc) => {
    return (
      svc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      svc.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const runningCount = services.filter((s) => s.status === "RUNNING").length;

  if (isLoading && !project) {
    return (
      <DashboardShell title="Loading Project...">
        <ProjectCanvasSkeleton />
      </DashboardShell>
    );
  }

  if (error || !project) {
    return (
      <DashboardShell title="Project Not Found">
        <div className="p-8 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Project Unavailable</h2>
          <p className="text-xs text-zinc-400 mt-1 mb-6">
            {error || "The requested project workspace could not be found."}
          </p>
          <Link href="/workspace/projects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Projects
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={project.name}
      subtitle={`Workspace /${project.slug}`}
      showCreateButton={false}
      noTopPadding={true}
    >
      <div className="space-y-6">
        {/* Top Breadcrumb & Project Header & Tabs Bar (Fixed on scroll) */}
        <div className="shrink-0 z-20 bg-[#030304] sticky top-0 pt-4 sm:pt-6 pb-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-4">
              <Link
                href="/workspace/projects"
                className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] hover:bg-zinc-850 transition-all group"
                title="Back to Projects"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </Link>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-white">{project.name}</h1>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-zinc-900/60 border border-white/[0.06] text-zinc-400">
                    /{project.slug}
                  </span>
                  <span
                    className={`text-xs font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                      runningCount > 0
                        ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400"
                        : "bg-zinc-900/60 border-white/[0.06] text-zinc-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        runningCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                      }`}
                    />
                    <span>{runningCount} Running</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Workspace containing {services.length} {services.length === 1 ? "service" : "services"} • Interconnected internal routing enabled.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh workspace status"
                className="h-8.5 w-8.5 p-0 rounded-lg text-zinc-400 hover:text-white bg-zinc-900/60 border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
              >
                <RotateCw className={`w-3.5 h-3.5 transition-transform ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5 text-black stroke-[2.5]" />}
                onClick={() => openCreateService("git", "WEB")}
                className="h-8.5 px-3.5 rounded-lg font-semibold text-xs tracking-tight shadow-sm hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all cursor-pointer"
              >
                New Service
              </Button>
            </div>
          </div>

          {/* Project Navigation Tabs */}
          <div className="flex items-center border-b border-white/[0.06] gap-6 text-xs pt-2">
            <button
              onClick={() => setActiveTab("services")}
              className={`pb-3 font-semibold transition-colors relative cursor-pointer flex items-center gap-2 ${
                activeTab === "services"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Services</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === "services"
                    ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40"
                    : "bg-zinc-850 text-zinc-400"
                }`}
              >
                {services.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("domains")}
              className={`pb-3 font-semibold transition-colors relative cursor-pointer flex items-center gap-2 ${
                activeTab === "domains"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Domains</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === "domains"
                    ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40"
                    : "bg-zinc-850 text-zinc-400"
                }`}
              >
                {services.filter((s) => s.subdomain).length + domains.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("variables")}
              className={`pb-3 font-semibold transition-colors relative cursor-pointer flex items-center gap-2 ${
                activeTab === "variables"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Shared Variables</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-3 font-semibold transition-colors relative cursor-pointer flex items-center gap-2 ${
                activeTab === "settings"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Project Settings</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SERVICES CANVAS */}
        {activeTab === "services" && (
          <div className="space-y-5">
            {/* Search Bar */}
            {services.length > 0 && (
              <div className="flex items-center justify-end gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs bg-zinc-950/60 border-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Empty State */}
            {services.length === 0 ? (
              <div className="relative rounded-2xl border border-zinc-800/90 bg-zinc-950/70 backdrop-blur-xl shadow-2xl p-12 sm:p-16 text-center overflow-hidden">
                {/* Top cyan laser line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                {/* Subtle ambient glow */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[500px] h-48 bg-gradient-to-b from-cyan-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

                <div className="max-w-md mx-auto flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_25px_-3px_rgba(0,210,255,0.25)]">
                    <Boxes className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    No services in this project yet
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 mb-6 leading-relaxed">
                    Deploy your first service to this workspace. You can connect a Git repository, deploy a Docker container, or provision a managed database.
                  </p>

                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="w-4 h-4 text-black stroke-[2.5]" />}
                    onClick={() => openCreateService("git", "WEB")}
                    className="h-10 px-5 rounded-lg font-semibold text-xs tracking-tight shadow-sm hover:shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all cursor-pointer"
                  >
                    Add First Service
                  </Button>
                </div>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 border border-zinc-850 rounded-xl bg-zinc-950/40">
                <Search className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="text-xs">No services match your search or filter.</p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300 ${isRefreshing ? "opacity-50" : "opacity-100"}`}>
                {filteredServices.map((svc) => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    projectId={projectId}
                    onDeploy={handleDeployService}
                    onRestart={handleRestartService}
                    onStop={handleStopService}
                    onDelete={(s) => setServiceToDelete(s)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SERVICE DOMAINS */}
        {activeTab === "domains" && (
          <div className="space-y-6 max-w-4xl">
            {/* Header info banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-cyan-950/20 via-zinc-900/60 to-zinc-900/30 border border-cyan-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Project Service Domains</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  In KotaCloud Spaces, domains and ingress routing are configured directly per service. Select any service below to customize its subdomain or attach your custom brand domain.
                </p>
              </div>
            </div>

            {/* List of Services and their Domains */}
            <div className="space-y-4">
              {services.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center">
                  <Globe className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-zinc-300">No Services in this Project</h4>
                  <p className="text-xs text-zinc-500 mt-1 mb-4">
                    Create a service to provision an automated subdomain and attach custom domains.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openCreateService("git", "WEB")}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Create Service
                  </Button>
                </div>
              ) : (
                services.map((svc) => {
                  const svcCustomDomains = domains.filter((d) => d.service_id === svc.id);
                  const isDb = svc.type === "DATABASE";

                  return (
                    <Card
                      key={svc.id}
                      className="p-5 border-zinc-800 bg-zinc-950/60 hover:border-zinc-700/80 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-850">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                            {isDb ? <Boxes className="w-4 h-4 text-emerald-400" /> : <Globe className="w-4 h-4 text-cyan-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{svc.name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono border bg-zinc-900 text-zinc-400 border-zinc-800">
                                {svc.type}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.2 rounded-full border ${
                                  svc.status === "RUNNING"
                                    ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
                                    : "text-zinc-400 bg-zinc-900 border-zinc-800"
                                }`}
                              >
                                ● {svc.status}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-500">
                              Port {svc.container_port} {svc.host_port ? `➔ Host :${svc.host_port}` : ""}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/workspace/projects/${projectId}/services/${svc.id}?tab=settings&section=domains`)}
                          className="text-xs h-8 gap-1.5 border-zinc-800 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-400"
                        >
                          <span>Manage Domains</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Default Subdomain */}
                      {svc.subdomain && (() => {
                        const isCustom = svc.subdomain.includes(".");
                        const domainDisplay = isCustom ? svc.subdomain : `${svc.subdomain}-spaces.kotacloud.com`;
                        const domainUrl = `https://${domainDisplay}`;
                        return (
                          <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-850/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={domainUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold font-mono text-cyan-400 hover:text-cyan-300 truncate flex items-center gap-1"
                                  >
                                    <span>{domainDisplay}</span>
                                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                                  </a>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
                                    {isCustom ? "CUSTOM" : "SUBDOMAIN"}
                                  </span>
                                </div>
                                <span className="text-[11px] text-zinc-500 font-mono">
                                  Auto-TLS & Reverse Proxy Active
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(domainUrl);
                                  setCopiedDomain(svc.id);
                                  setTimeout(() => setCopiedDomain(null), 2000);
                                  toast.success("Copied", { message: "Domain URL copied to clipboard." });
                                }}
                                className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                                title="Copy URL"
                              >
                                {copiedDomain === svc.id ? (
                                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <a
                                href={domainUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-850 hover:bg-zinc-750 text-white border border-zinc-700 transition-colors"
                              >
                                <span>Visit</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Custom domains attached to this service */}
                      {svcCustomDomains.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                            Custom Domains ({svcCustomDomains.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {svcCustomDomains.map((cd) => (
                              <div
                                key={cd.id}
                                className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs font-mono"
                              >
                                <a
                                  href={`https://${cd.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white hover:text-cyan-400 truncate flex items-center gap-1.5"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate">{cd.domain}</span>
                                </a>
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0">
                                  ACTIVE
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>

            {/* DNS Reference Card */}
            <Card className="p-5 border-zinc-800 bg-zinc-950/60 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Custom Domain DNS Configuration Reference</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                To route your own custom domain (e.g. <code>api.yourbrand.com</code>) to any service in this project, create a <strong>CNAME</strong> record with your DNS provider pointing to:
              </p>
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 mr-2">CNAME:</span>
                  <span className="text-cyan-300 font-semibold select-all">cname.spaces.kotacloud.com</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText("cname.spaces.kotacloud.com");
                    setCopiedDomain("dns-ref");
                    setTimeout(() => setCopiedDomain(null), 2000);
                    toast.success("Copied", { message: "DNS target copied to clipboard." });
                  }}
                  className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {copiedDomain === "dns-ref" ? (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: SHARED PROJECT VARIABLES */}
        {activeTab === "variables" && (
          <Card className="border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Shared Project Environment Variables</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Variables defined here can be referenced or inherited by all services in this project (e.g. shared JWT secret, shared API keys).
              </p>
            </div>

            <EnvEditor
              initialEnvVars={sharedEnvVars}
              onSave={async (newVars) => {
                setIsSavingEnv(true);
                try {
                  localStorage.setItem(`kospaces_shared_env_${projectId}`, JSON.stringify(newVars));
                  setSharedEnvVars(newVars);
                  toast.success("Saved", {
                    message: "Shared project environment variables updated.",
                  });
                } finally {
                  setIsSavingEnv(false);
                }
              }}
              isSaving={isSavingEnv}
            />
          </Card>
        )}

        {/* TAB 3: PROJECT SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            <Card className="border-zinc-800 bg-zinc-950/60 p-6">
              <h3 className="text-sm font-semibold text-white mb-4">General Settings</h3>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Project Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isUpdatingName}
                    className="bg-zinc-900 border-zinc-800 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Project Slug</label>
                  <Input
                    value={project.slug}
                    disabled
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-500 font-mono text-xs cursor-not-allowed"
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={isUpdatingName || editName.trim() === project.name}
                  >
                    {isUpdatingName ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Danger Zone */}
            <Card className="border-rose-900/40 bg-rose-950/10 p-6">
              <h3 className="text-sm font-semibold text-rose-400">Danger Zone</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-4">
                Deleting this project will permanently remove all associated services, containers, and deployment history.
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteProjectModal(true)}
                className="gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Project</span>
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Modal: Create Service */}
      <CreateServiceModal
        isOpen={isCreateServiceOpen}
        onClose={() => setIsCreateServiceOpen(false)}
        projectId={projectId}
        initialTab={modalInitialTab}
        initialServiceType={modalInitialType}
        onServiceCreated={(newSvc) => {
          setServices((prev) => [...prev, newSvc]);
        }}
      />

      {/* Dialog: Delete Service Confirm */}
      <ConfirmDialog
        isOpen={Boolean(serviceToDelete)}
        onClose={() => setServiceToDelete(null)}
        onConfirm={handleDeleteServiceConfirm}
        title="Delete Service"
        description={`Are you sure you want to delete the service "${serviceToDelete?.name}"? Its running container and deployments will be removed.`}
        confirmText={isDeletingService ? "Deleting..." : "Delete Service"}
        variant="danger"
        isLoading={isDeletingService}
        verificationKeyword={serviceToDelete?.name}
      />

      {/* Dialog: Delete Project Confirm */}
      <ConfirmDialog
        isOpen={showDeleteProjectModal}
        onClose={() => setShowDeleteProjectModal(false)}
        onConfirm={handleDeleteProjectConfirm}
        title="Delete Entire Project"
        description={`Are you sure you want to delete "${project.name}" and all of its ${services.length} services? This action cannot be undone.`}
        confirmText={isDeletingProject ? "Deleting..." : "Delete Project"}
        variant="danger"
        isLoading={isDeletingProject}
        verificationKeyword={project.name}
      />
    </DashboardShell>
  );
}
