"use client";

import React, { use, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { LogViewer } from "@/components/logs/log-viewer";
import { EnvEditor } from "@/components/settings/env-editor";
import { platformServiceHost, platformServiceUrl } from "@/lib/platform";
import {
  getServiceApi,
  updateServiceApi,
  deployServiceApi,
  startServiceApi,
  stopServiceApi,
  restartServiceApi,
  deleteServiceApi,
} from "@/lib/api/services";
import { apiClient } from "@/lib/api/client";
import { cleanRepoUrl, fetchRepoBranches, getAvailableGithubToken } from "@/lib/git";
import { getProjectApi, getProjectDomainsApi } from "@/lib/api/projects";
import { getDeploymentLogsApi } from "@/lib/api/deployments";
import { DomainManager } from "@/components/domains/domain-manager";
import { DatabaseManager } from "@/components/database/database-manager";
import { ServiceIcon } from "@/components/services/service-icon";
import { Project } from "@/types/project";
import { Service, UpdateServiceRequest } from "@/types/service";
import { DeploymentLog } from "@/types/deployment";
import { Domain } from "@/types/domain";
import { useToast } from "@/lib/toast/toast-context";
import { ServiceDetailSkeleton } from "@/components/ui/skeleton";
import {
  Globe,
  Play,
  RotateCw,
  Square,
  Trash2,
  Terminal,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Settings,
  Layers,
  Clock,
  AlertTriangle,
  X,
  Database,
  Copy,
  Check,
  Pencil,
  Sparkles,
  Code2,
  Network,
  Cpu,
  Save,
  GitBranch,
  GitCommit,
  Zap,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  RotateCcw,
} from "lucide-react";

function getEffectiveDockerImage(svc: Service): string {
  if (svc.docker_image) return svc.docker_image;
  if (svc.deployments?.[0]?.docker_image) return svc.deployments[0].docker_image;
  if (svc.type === "DATABASE" || svc.source_type === "DOCKER") {
    const lower = svc.name.toLowerCase();
    if (lower.includes("redis")) return "redis:7-alpine";
    if (lower.includes("mysql")) return "mysql:8.0";
    if (lower.includes("mariadb")) return "mariadb:11.2";
    if (lower.includes("mongo")) return "mongo:7-jammy";
    return "postgres:16-alpine";
  }
  return "";
}

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; serviceId: string }>;
}) {
  const resolvedParams = use(params);
  const { projectId, serviceId } = resolvedParams;
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const qTab = new URLSearchParams(window.location.search).get("tab");
      if (qTab === "domains" || qTab === "networking") return "settings";
      if (qTab) return qTab;
    }
    return "overview";
  });

  const [activeSettingsSection, setActiveSettingsSection] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const qSection = p.get("section");
      const qTab = p.get("tab");
      if (qSection) return qSection;
      if (qTab === "domains") return "domains";
      if (qTab === "networking") return "networking";
    }
    return "source";
  });

  // Domains & Subdomain state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [customSubdomain, setCustomSubdomain] = useState("");

  const fetchDomains = useCallback(async () => {
    try {
      const res = await getProjectDomainsApi(projectId);
      setDomains(res.domains || []);
    } catch {
      // ignore
    }
  }, [projectId]);

  // Data state
  const [project, setProject] = useState<Project | null>(null);
  const [service, setService] = useState<Service | null>(null);

  const isDatabaseService = useMemo(() => {
    if (!service) return false;
    if (service.type === "DATABASE") return true;
    const img = getEffectiveDockerImage(service).toLowerCase();
    const sName = service.name.toLowerCase();
    return (
      img.includes("postgres") ||
      img.includes("mysql") ||
      img.includes("mariadb") ||
      img.includes("mongo") ||
      img.includes("redis") ||
      sName.includes("postgres") ||
      sName.includes("mysql") ||
      sName.includes("mariadb") ||
      sName.includes("mongo") ||
      sName.includes("redis")
    );
  }, [service]);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [openLogTabIds, setOpenLogTabIds] = useState<string[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [dockerImage, setDockerImage] = useState("");
  const [containerPort, setContainerPort] = useState(8080);
  const [memoryMB, setMemoryMB] = useState(512);
  const [cpus, setCpus] = useState(0.5);
  // Environment variables state
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [autoDeploy, setAutoDeploy] = useState(true);

  // Automatically sync connected GitHub account token to backend if available
  useEffect(() => {
    try {
      const token = getAvailableGithubToken();
      if (token) {
        apiClient("/auth/github/token", {
          method: "POST",
          body: JSON.stringify({ token }),
        }).catch(() => { });
      }
    } catch {
      // ignore
    }
  }, []);

  // Railway-style Apply Changes state
  const hasLoadedInitially = useRef(false);
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());
  const markFieldEdited = useCallback((field: string) => {
    setUserEditedFields((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [showChangesDetails, setShowChangesDetails] = useState(false);
  const [showDiscardMenu, setShowDiscardMenu] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateSubdomain = async (newSubdomain: string) => {
    const isCustom = newSubdomain.includes(".");
    let clean = newSubdomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    if (isCustom) {
      clean = clean
        .replace(/[^a-z0-9.-]/g, "")
        .replace(/^\.+|\.+$/g, "")
        .replace(/^-+|-+$/g, "");
    } else {
      clean = clean
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (!clean) {
      toast.error("Invalid Domain", { message: "Domain / Subdomain cannot be empty." });
      throw new Error("Domain cannot be empty");
    }

    try {
      const updated = await updateServiceApi(serviceId, { subdomain: clean });
      setService(updated);
      setCustomSubdomain(updated.subdomain || clean);
      if (updated.env_vars) {
        setEnvVars(updated.env_vars);
      }
      toast.success("Domain Updated", {
        message: clean.includes(".")
          ? `Nginx configuration updated for ${clean} (zero-downtime)`
          : `Nginx configuration updated for ${platformServiceHost(clean)} (zero-downtime)`,
      });
      fetchDomains();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating domain";
      toast.error("Failed to update domain", { message: msg });
      throw err;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const qSection = p.get("section");
      const qTab = p.get("tab");
      const target = qSection || (qTab === "domains" ? "domains" : qTab === "networking" ? "networking" : null);
      if (target) {
        setActiveSettingsSection(target);
        setTimeout(() => {
          const el = document.getElementById(`section-${target}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 400);
      }
    }
  }, []);

  // Scroll spy to highlight active section in the sticky Service Settings card on scroll
  useEffect(() => {
    if (activeTab !== "settings") return;

    const handleScroll = () => {
      const sections = ["source", "networking", "domains", "resources", "danger"];
      for (const s of sections) {
        const el = document.getElementById(`section-${s}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 260 && rect.bottom >= 200) {
            setActiveSettingsSection(s);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [activeTab]);

  const fetchServiceData = async () => {
    try {
      const [projData, svcData] = await Promise.all([
        getProjectApi(projectId),
        getServiceApi(serviceId),
      ]);
      setProject(projData);
      setService(svcData);
      setName(svcData.name);
      setDescription(svcData.description || "");
      setRepositoryUrl(cleanRepoUrl(svcData.repository_url) || "");
      setBranch(svcData.branch || "main");
      setDockerImage(getEffectiveDockerImage(svcData));
      setContainerPort(svcData.container_port || 8080);
      setMemoryMB(svcData.memory_mb || 512);
      setCpus(svcData.cpus || 0.5);
      setEnvVars(svcData.env_vars || {});
      setAutoDeploy(svcData.auto_deploy ?? true);
      setCustomSubdomain(svcData.subdomain || "");
      setUserEditedFields(new Set());
      setError(null);
      fetchDomains();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load service";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [projData, svcData, domainsData] = await Promise.all([
          getProjectApi(projectId),
          getServiceApi(serviceId),
          getProjectDomainsApi(projectId).catch(() => ({ domains: [] })),
        ]);
        if (isMounted) {
          setProject(projData);
          setService(svcData);
          setDomains(domainsData.domains || []);
          if (!hasLoadedInitially.current) {
            hasLoadedInitially.current = true;
            setName(svcData.name);
            setDescription(svcData.description || "");
            setRepositoryUrl(cleanRepoUrl(svcData.repository_url) || "");
            setBranch(svcData.branch || "main");
            setDockerImage(getEffectiveDockerImage(svcData));
            setContainerPort(svcData.container_port || 8080);
            setMemoryMB(svcData.memory_mb || 512);
            setCpus(svcData.cpus || 0.5);
            setEnvVars(svcData.env_vars || {});
            setAutoDeploy(svcData.auto_deploy ?? true);
            setCustomSubdomain(svcData.subdomain || "");
          } else {
            // Background polling: automatically sync any fields that user has NOT actively edited
            setUserEditedFields((edited) => {
              if (!edited.has("name")) setName(svcData.name);
              if (!edited.has("description")) setDescription(svcData.description || "");
              if (!edited.has("branch")) setBranch(svcData.branch || "main");
              if (!edited.has("auto_deploy")) setAutoDeploy(svcData.auto_deploy ?? true);
              if (!edited.has("port")) setContainerPort(svcData.container_port || 8080);
              if (!edited.has("memory")) setMemoryMB(svcData.memory_mb || 512);
              if (!edited.has("cpus")) setCpus(svcData.cpus || 0.5);
              if (!edited.has("env_vars")) setEnvVars(svcData.env_vars || {});
              return edited;
            });
            setCustomSubdomain(svcData.subdomain || "");
            setDockerImage(getEffectiveDockerImage(svcData));
            setRepositoryUrl(cleanRepoUrl(svcData.repository_url) || "");
          }
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load service";
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
  }, [projectId, serviceId]);

  // Fetch real branches from repository for Git services
  useEffect(() => {
    if (service?.source_type === "GIT" && service?.repository_url) {
      setIsLoadingBranches(true);
      fetchRepoBranches(service.repository_url)
        .then((branches) => {
          if (branches && branches.length > 0) {
            setAvailableBranches(branches);
          } else if (service.branch) {
            setAvailableBranches([service.branch]);
          }
        })
        .catch(() => {
          if (service.branch) setAvailableBranches([service.branch]);
        })
        .finally(() => {
          setIsLoadingBranches(false);
        });
    }
  }, [service?.repository_url, service?.source_type, service?.branch]);

  const hasInitializedLogTabs = useRef(false);
  const previousLatestDeploymentId = useRef<string | null>(null);

  // Synchronize open tabs when deployments change
  useEffect(() => {
    if (service?.deployments && service.deployments.length > 0) {
      const latestId = service.deployments[0].id;
      if (!hasInitializedLogTabs.current) {
        hasInitializedLogTabs.current = true;
        previousLatestDeploymentId.current = latestId;
        setOpenLogTabIds([latestId]);
        setSelectedDeploymentId(latestId);
      } else {
        // If a new deployment has been created (e.g. from redeploy / new build)
        if (previousLatestDeploymentId.current && previousLatestDeploymentId.current !== latestId) {
          previousLatestDeploymentId.current = latestId;
          setOpenLogTabIds((prev) => {
            if (!prev.includes(latestId)) {
              return [latestId, ...prev.filter((id) => service.deployments!.some((d) => d.id === id))];
            }
            return prev.filter((id) => service.deployments!.some((d) => d.id === id));
          });
          setSelectedDeploymentId(latestId);
        } else {
          // Filter out any IDs that no longer exist
          setOpenLogTabIds((prev) =>
            prev.filter((id) => service.deployments!.some((d) => d.id === id))
          );
        }
      }
    }
  }, [service?.deployments]);

  const activeDeploymentId =
    (selectedDeploymentId && openLogTabIds.includes(selectedDeploymentId)
      ? selectedDeploymentId
      : openLogTabIds[0]) || service?.deployments?.[0]?.id;

  const handleCloseLogTab = (e: React.MouseEvent, depId: string) => {
    e.stopPropagation();
    // Do not allow closing the latest deployment tab
    if (depId === service?.deployments?.[0]?.id) {
      return;
    }
    const nextTabs = openLogTabIds.filter((id) => id !== depId);
    setOpenLogTabIds(nextTabs);

    if (depId === activeDeploymentId) {
      if (nextTabs.length > 0) {
        setSelectedDeploymentId(nextTabs[nextTabs.length - 1]);
      } else {
        const latestId = service?.deployments?.[0]?.id || null;
        setSelectedDeploymentId(latestId);
        if (!latestId) {
          setActiveTab("overview");
        }
      }
    }
  };

  const selectedDeploymentIndex = service?.deployments?.findIndex(
    (d) => d.id === activeDeploymentId
  );
  const selectedDeploymentNumber =
    selectedDeploymentIndex !== undefined && selectedDeploymentIndex !== -1 && service?.deployments
      ? service.deployments.length - selectedDeploymentIndex
      : undefined;
  const selectedDeployment = service?.deployments?.find(
    (d) => d.id === activeDeploymentId
  );

  // Fetch logs for active deployment if exists
  const fetchLogs = useCallback(
    async (showLoading = false) => {
      if (!activeDeploymentId) return;
      if (showLoading) {
        setIsFetchingLogs(true);
      }
      try {
        const logData = await getDeploymentLogsApi(activeDeploymentId, undefined, 2000);
        setLogs(logData?.logs || []);
      } catch {
        // ignore
      } finally {
        if (showLoading) {
          setIsFetchingLogs(false);
        }
      }
    },
    [activeDeploymentId]
  );

  useEffect(() => {
    if (activeTab !== "logs" || !activeDeploymentId) return;

    let isMounted = true;
    const loadLogs = async () => {
      try {
        const logData = await getDeploymentLogsApi(activeDeploymentId, undefined, 2000);
        if (isMounted) {
          setLogs(logData?.logs || []);
        }
      } catch {
        // ignore
      }
    };

    loadLogs();

    if (autoRefreshLogs) {
      const interval = setInterval(loadLogs, 3000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, autoRefreshLogs, activeDeploymentId]);

  // Actions
  const handleDeploy = async () => {
    if (!service) return;
    try {
      toast.info("Deploying", {
        message: `Triggering build for ${service.name}...`,
      });

      let deployPayload: { repository_url?: string; branch?: string; git_token?: string } | undefined = undefined;
      const availableGhToken = getAvailableGithubToken(service.repository_url);
      if (availableGhToken) {
        deployPayload = { git_token: availableGhToken };
      }

      if (service.source_type === "GIT" && service.repository_url && !service.repository_url.includes("@")) {
        try {
          const userRaw = localStorage.getItem("kospaces_current_user");
          const currentUserId = userRaw ? JSON.parse(userRaw)?.id : null;
          const ghKey = currentUserId ? `kospaces_github_auth_${currentUserId}` : "kospaces_github_auth";
          const glKey = currentUserId ? `kospaces_gitlab_auth_${currentUserId}` : "kospaces_gitlab_auth";

          const ghAuth = localStorage.getItem(ghKey) || localStorage.getItem("kospaces_github_auth");
          if (ghAuth && service.repository_url.includes("github.com")) {
            const parsed = JSON.parse(ghAuth);
            if (parsed?.token) {
              deployPayload = {
                ...deployPayload,
                git_token: parsed.token,
                repository_url: service.repository_url.replace(
                  "https://github.com/",
                  `https://x-access-token:${parsed.token}@github.com/`
                ),
              };
            }
          }
          const glAuth = localStorage.getItem(glKey) || localStorage.getItem("kospaces_gitlab_auth");
          if (glAuth && service.repository_url.includes("gitlab.com")) {
            const parsed = JSON.parse(glAuth);
            if (parsed?.token) {
              deployPayload = {
                repository_url: service.repository_url.replace(
                  "https://gitlab.com/",
                  `https://oauth2:${parsed.token}@gitlab.com/`
                ),
              };
            }
          }
        } catch {
          // ignore
        }
      }

      const updatedService = await deployServiceApi(service.id, deployPayload);
      toast.success("Queued", { message: "Deployment initiated." });
      if (updatedService?.deployments && updatedService.deployments.length > 0) {
        const newDepId = updatedService.deployments[0].id;
        previousLatestDeploymentId.current = newDepId;
        setService(updatedService);
        setOpenLogTabIds((prev) => {
          if (!prev.includes(newDepId)) {
            return [newDepId, ...prev];
          }
          return prev;
        });
        setSelectedDeploymentId(newDepId);
      } else {
        fetchServiceData();
      }
      setActiveTab("logs");
    } catch (err: unknown) {
      toast.error("Deploy Failed", {
        message: err instanceof Error ? err.message : "Error",
      });
    }
  };

  const handleRestart = async () => {
    if (!service) return;
    try {
      await restartServiceApi(service.id);
      toast.success("Restarted", {
        message: "Container restarted successfully.",
      });
      fetchServiceData();
    } catch (err: unknown) {
      toast.error("Restart Failed", {
        message: err instanceof Error ? err.message : "Error",
      });
    }
  };

  const handleStop = async () => {
    if (!service) return;
    try {
      await stopServiceApi(service.id);
      toast.success("Stopped", { message: "Container stopped." });
      fetchServiceData();
    } catch (err: unknown) {
      toast.error("Stop Failed", {
        message: err instanceof Error ? err.message : "Error",
      });
    }
  };

  const handleCancelBuild = async () => {
    if (!service) return;
    try {
      toast.info("Stopping Build", {
        message: "Stopping the active build process...",
      });
      await stopServiceApi(service.id);
      toast.success("Build Stopped", {
        message: "Build process has been stopped.",
      });
      fetchServiceData();
    } catch (err: unknown) {
      toast.error("Stop Failed", {
        message: err instanceof Error ? err.message : "Error",
      });
    }
  };

  const handleStart = async () => {
    if (!service) return;
    try {
      await startServiceApi(service.id);
      toast.success("Started", { message: "Container started." });
      fetchServiceData();
    } catch (err: unknown) {
      toast.error("Start Failed", {
        message: err instanceof Error ? err.message : "Error",
      });
    }
  };

  // Railway-style Pending Changes Calculation
  const pendingChanges = useMemo(() => {
    if (!service) return [];
    const list: { id: string; label: string; description?: string }[] = [];

    if (userEditedFields.has("name") && name.trim() !== (service.name || "").trim()) {
      list.push({
        id: "name",
        label: "Service Name",
        description: `"${service.name}" → "${name.trim()}"`,
      });
    }

    if (userEditedFields.has("description") && description.trim() !== (service.description || "").trim()) {
      list.push({
        id: "description",
        label: "Description",
        description: `"${service.description || "none"}" → "${description.trim() || "none"}"`,
      });
    }

    if (userEditedFields.has("branch") && service.source_type === "GIT" && branch.trim() !== (service.branch || "main").trim()) {
      list.push({
        id: "branch",
        label: "Git Branch",
        description: `"${service.branch || "main"}" → "${branch.trim()}"`,
      });
    }

    if (userEditedFields.has("auto_deploy") && autoDeploy !== (service.auto_deploy ?? true)) {
      list.push({
        id: "auto_deploy",
        label: "Auto Deploy on Commit",
        description: `${(service.auto_deploy ?? true) ? "Enabled" : "Disabled"} → ${autoDeploy ? "Enabled" : "Disabled"}`,
      });
    }

    if (userEditedFields.has("port") && Number(containerPort) !== (service.container_port || 8080)) {
      list.push({
        id: "port",
        label: "Container Port",
        description: `:${service.container_port || 8080} → :${containerPort}`,
      });
    }

    if (userEditedFields.has("memory") && Number(memoryMB) !== (service.memory_mb || 512)) {
      list.push({
        id: "memory",
        label: "Memory Limit",
        description: `${service.memory_mb || 512}MB → ${memoryMB}MB`,
      });
    }

    if (userEditedFields.has("cpus") && Number(cpus) !== (service.cpus || 0.5)) {
      list.push({
        id: "cpus",
        label: "CPU Cores",
        description: `${service.cpus || 0.5} CPU → ${cpus} CPU`,
      });
    }

    // Check env vars differences
    if (userEditedFields.has("env_vars")) {
      const origEnv = service.env_vars || {};
      const allKeys = Array.from(new Set([...Object.keys(envVars), ...Object.keys(origEnv)]));
      let envDiffCount = 0;
      const changedKeyNames: string[] = [];
      for (const k of allKeys) {
        if (envVars[k] !== origEnv[k]) {
          envDiffCount++;
          changedKeyNames.push(k);
        }
      }
      if (envDiffCount > 0) {
        list.push({
          id: "env_vars",
          label: "Environment Variables",
          description: `${envDiffCount} variable${envDiffCount > 1 ? "s" : ""} modified (${changedKeyNames.slice(0, 3).join(", ")}${changedKeyNames.length > 3 ? "..." : ""})`,
        });
      }
    }

    return list;
  }, [service, name, description, branch, containerPort, memoryMB, cpus, envVars, userEditedFields]);

  const needsRedeploy = useMemo(() => {
    return pendingChanges.some((c) => c.id !== "name" && c.id !== "description" && c.id !== "auto_deploy");
  }, [pendingChanges]);

  const handleApplyAllChanges = useCallback(async () => {
    if (!service || pendingChanges.length === 0) return;
    setIsApplyingChanges(true);
    try {
      const payload: UpdateServiceRequest = {};
      if (name.trim() !== (service.name || "").trim()) payload.name = name.trim();
      if (description.trim() !== (service.description || "").trim()) payload.description = description.trim();
      if (service.source_type === "GIT" && branch.trim() !== (service.branch || "main").trim()) payload.branch = branch.trim();
      if (autoDeploy !== (service.auto_deploy ?? true)) payload.auto_deploy = autoDeploy;
      const availableGhToken = getAvailableGithubToken(service?.repository_url);
      if (availableGhToken && !service.git_token) payload.git_token = availableGhToken;
      if (Number(containerPort) !== (service.container_port || 8080) && Number(containerPort) > 0) payload.container_port = Number(containerPort);
      if (Number(memoryMB) !== (service.memory_mb || 512) && Number(memoryMB) > 0) payload.memory_mb = Number(memoryMB);
      if (Number(cpus) !== (service.cpus || 0.5) && Number(cpus) > 0) payload.cpus = Number(cpus);

      const origEnv = service.env_vars || {};
      const isEnvDiff = JSON.stringify(envVars) !== JSON.stringify(origEnv);
      if (isEnvDiff) {
        payload.env_vars = envVars;
      }

      // Check if any runtime setting requires a redeployment
      const shouldRedeploy = pendingChanges.some(
        (c) => c.id !== "name" && c.id !== "description"
      );

      // 1. Update service settings in database
      await updateServiceApi(service.id, payload);
      setUserEditedFields(new Set());

      if (shouldRedeploy) {
        // 2. Prepare redeployment payload (including Git credentials if applicable)
        let deployPayload: { repository_url?: string; branch?: string } | undefined = undefined;
        const targetRepoUrl = service.repository_url;
        if (service.source_type === "GIT" && targetRepoUrl && !targetRepoUrl.includes("@")) {
          try {
            const userRaw = localStorage.getItem("kospaces_current_user");
            const currentUserId = userRaw ? JSON.parse(userRaw)?.id : null;
            const ghKey = currentUserId ? `kospaces_github_auth_${currentUserId}` : "kospaces_github_auth";
            const glKey = currentUserId ? `kospaces_gitlab_auth_${currentUserId}` : "kospaces_gitlab_auth";

            const ghAuth = localStorage.getItem(ghKey) || localStorage.getItem("kospaces_github_auth");
            if (ghAuth && targetRepoUrl.includes("github.com")) {
              const parsed = JSON.parse(ghAuth);
              if (parsed?.token) {
                deployPayload = {
                  repository_url: targetRepoUrl.replace(
                    "https://github.com/",
                    `https://x-access-token:${parsed.token}@github.com/`
                  ),
                };
              }
            }
            const glAuth = localStorage.getItem(glKey) || localStorage.getItem("kospaces_gitlab_auth");
            if (glAuth && targetRepoUrl.includes("gitlab.com")) {
              const parsed = JSON.parse(glAuth);
              if (parsed?.token) {
                deployPayload = {
                  repository_url: targetRepoUrl.replace(
                    "https://gitlab.com/",
                    `https://oauth2:${parsed.token}@gitlab.com/`
                  ),
                };
              }
            }
          } catch {
            // ignore
          }
        }

        if (service.source_type === "GIT" && branch.trim()) {
          deployPayload = { ...deployPayload, branch: branch.trim() };
        }

        // 3. Immediately trigger redeployment so container applies the new settings
        const updatedService = await deployServiceApi(service.id, deployPayload);

        toast.success("Changes Applied & Redeploying", {
          message: `Applied ${pendingChanges.length} service change${pendingChanges.length > 1 ? "s" : ""} and triggered container redeployment.`,
        });

        setShowChangesDetails(false);
        setShowDiscardMenu(false);

        if (updatedService?.deployments && updatedService.deployments.length > 0) {
          const newDepId = updatedService.deployments[0].id;
          previousLatestDeploymentId.current = newDepId;
          setService(updatedService);
          setOpenLogTabIds((prev) => {
            if (!prev.includes(newDepId)) {
              return [newDepId, ...prev];
            }
            return prev;
          });
          setSelectedDeploymentId(newDepId);
        } else {
          await fetchServiceData();
        }

        setActiveTab("logs");
      } else {
        // Only name and/or description were modified - NO redeploy needed!
        toast.success("Changes Applied", {
          message: "Service name and description updated successfully.",
        });

        setShowChangesDetails(false);
        setShowDiscardMenu(false);
        await fetchServiceData();
      }
    } catch (err: unknown) {
      toast.error("Failed to Apply Changes", {
        message: err instanceof Error ? err.message : "Error applying changes",
      });
    } finally {
      setIsApplyingChanges(false);
    }
  }, [service, pendingChanges, name, description, branch, containerPort, memoryMB, cpus, envVars, toast]);

  const handleDiscardAllChanges = useCallback(() => {
    if (!service) return;
    setUserEditedFields(new Set());
    setName(service.name || "");
    setDescription(service.description || "");
    setBranch(service.branch || "main");
    setAutoDeploy(service.auto_deploy ?? true);
    setContainerPort(service.container_port || 8080);
    setMemoryMB(service.memory_mb || 512);
    setCpus(service.cpus || 0.5);
    setEnvVars(service.env_vars || {});
    setShowChangesDetails(false);
    setShowDiscardMenu(false);
    toast.info("Changes Discarded", {
      message: "Reverted all unapplied settings and environment changes.",
    });
  }, [service, toast]);

  // Keyboard shortcut: Shift + Enter to apply pending changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "Enter" && pendingChanges.length > 0 && !isApplyingChanges) {
        e.preventDefault();
        handleApplyAllChanges();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingChanges.length, isApplyingChanges, handleApplyAllChanges]);

  const handleDeleteService = async () => {
    if (!service) return;
    setIsDeleting(true);
    try {
      await deleteServiceApi(service.id);
      toast.success("Service Deleted", {
        message: `Service "${service.name}" was removed.`,
      });
      router.push(`/workspace/projects/${projectId}`);
    } catch (err: unknown) {
      toast.error("Error", {
        message: err instanceof Error ? err.message : "Error",
      });
      setIsDeleting(false);
    }
  };

  if (isLoading && !service) {
    return (
      <DashboardShell title="Loading Service...">
        <ServiceDetailSkeleton />
      </DashboardShell>
    );
  }

  if (error || !service) {
    return (
      <DashboardShell title="Service Not Found">
        <div className="p-8 text-center max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Service Unavailable</h2>
          <p className="text-xs text-zinc-400 mt-1 mb-6">
            {error || "The requested service could not be found in this project."}
          </p>
          <Link href={`/workspace/projects/${projectId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Project
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const serviceUrl = platformServiceUrl(service.subdomain) || null;

  const isBuilding = service.status === "BUILDING" || service.status === "DEPLOYING";

  return (
    <DashboardShell
      title={service.name}
      subtitle={`Service in /${project?.slug || ""}`}
      showCreateButton={false}
      fullHeight={activeTab === "logs"}
      noTopPadding={true}
    >
      <div className={activeTab === "logs" ? "flex-1 min-h-0 flex flex-col overflow-hidden" : "space-y-6"}>
        {/* Sticky Service Header & Tabs Bar (Fixed on scroll) */}
        <div className="shrink-0 z-20 bg-[#030304] sticky top-0 pt-4 sm:pt-6 pb-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          {/* Top Breadcrumb & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-1.5">
                <Link href="/workspace/projects" className="hover:text-zinc-200 transition-colors">
                  Projects
                </Link>
                <span>/</span>
                <Link
                  href={`/workspace/projects/${projectId}`}
                  className="hover:text-zinc-200 transition-colors"
                >
                  {project?.name || "Project"}
                </Link>
                <span>/</span>
                <span className="text-zinc-200 font-semibold">{service.name}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                  <ServiceIcon service={service} className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">{service.name}</h1>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-full border ${service.status === "RUNNING"
                      ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
                      : isBuilding
                        ? "text-amber-400 bg-amber-950/40 border-amber-800/40"
                        : "text-zinc-400 bg-zinc-900 border-zinc-800"
                    }`}
                >
                  ● {service.status}
                </span>
                {pendingChanges.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)] animate-in fade-in duration-200">
                    Edited
                  </span>
                )}
              </div>

              {serviceUrl && (
                <a
                  href={serviceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono mt-2"
                >
                  <span>
                    {platformServiceHost(service.subdomain)}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                disabled={isBuilding}
                title={isBuilding ? "Cannot restart while building" : "Restart Container"}
                className={`gap-1.5 text-xs ${isBuilding
                    ? "opacity-40 cursor-not-allowed text-zinc-500 hover:text-zinc-500 border-zinc-800"
                    : "text-zinc-300 hover:text-white"
                  }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </Button>

              {service.status === "RUNNING" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStop}
                  title="Stop Container"
                  className="gap-1.5 text-xs text-zinc-300 hover:text-rose-400"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStart}
                  disabled={isBuilding}
                  title={isBuilding ? "Cannot start while building" : "Start Container"}
                  className={`gap-1.5 text-xs ${isBuilding
                      ? "opacity-40 cursor-not-allowed text-zinc-500 hover:text-zinc-500 border-zinc-800"
                      : "text-emerald-400 hover:text-emerald-300 border-zinc-700/80"
                    }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </Button>
              )}

              {isBuilding ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancelBuild}
                  title="Stop Building Process"
                  className="gap-1.5 text-xs font-semibold shadow-[0_0_15px_-3px_rgba(244,63,94,0.35)] cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Build</span>
                </Button>
              ) : service.status === "RUNNING" ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDeploy}
                  title="Redeploy Service"
                  className="gap-1.5 text-xs font-semibold shadow-[0_0_20px_-3px_rgba(0,210,255,0.25)]"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Redeploy</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDeploy}
                  title="Deploy Now"
                  className="gap-1.5 text-xs font-semibold shadow-[0_0_20px_-3px_rgba(0,210,255,0.25)]"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Deploy Now</span>
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center w-full border-b border-white/[0.06] gap-6 text-xs overflow-x-auto scrollbar-none pt-2">
            {[
              { id: "overview", label: "Deployments", icon: Clock },
              { id: "logs", label: "Live Logs", icon: Terminal },
              { id: "variables", label: "Environment Variables", icon: Layers },
              ...(isDatabaseService ? [{ id: "database", label: "Database", icon: Database }] : []),
              { id: "settings", label: "Settings", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "logs") {
                      if (openLogTabIds.length === 0 && service?.deployments?.[0]?.id) {
                        setOpenLogTabIds([service.deployments[0].id]);
                        setSelectedDeploymentId(service.deployments[0].id);
                      }
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`pb-3 font-semibold transition-colors relative cursor-pointer -mb-[1px] ${isActive
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: DEPLOYMENTS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Deployment History</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Every build, git push, or manual deployment for this service.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeploy}
                disabled={isBuilding}
                className={`gap-1.5 text-xs ${isBuilding ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Trigger Build</span>
              </Button>
            </div>

            {(!service.deployments || service.deployments.length === 0) ? (
              <Card className="p-8 text-center border-dashed border-zinc-800 bg-zinc-950/40">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No deployments triggered yet for this service.</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDeploy}
                  disabled={isBuilding}
                  className="mt-4 gap-2 text-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Deploy Service Now</span>
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {service.deployments.map((dep, idx) => (
                  <Card key={dep.id} className="p-4 border-white/[0.06] bg-[#0c0d10] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-white">
                            Deployment #{service.deployments!.length - idx}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {dep.type}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${dep.status === "RUNNING"
                                ? "text-emerald-400 border-emerald-800/40 bg-emerald-950/40"
                                : dep.status === "BUILDING"
                                  ? "text-cyan-400 border-cyan-800/40 bg-cyan-950/40 animate-pulse"
                                  : "text-zinc-400 border-zinc-800"
                              }`}
                          >
                            {dep.status}
                          </span>

                          {/* GitHub Commit SHA Badge */}
                          {(dep.commit_sha || (idx === 0 && service.last_commit_sha)) && (
                            <a
                              href={
                                service.repository_url && service.repository_url.includes("github.com")
                                  ? `${service.repository_url.replace(/\.git$/, "")}/commit/${dep.commit_sha || service.last_commit_sha}`
                                  : undefined
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 hover:text-cyan-200 hover:border-cyan-500/60 transition-colors"
                              title={`View commit on GitHub: ${dep.commit_sha || service.last_commit_sha}`}
                            >
                              <GitCommit className="w-3 h-3 text-cyan-400" />
                              <span>{(dep.commit_sha || service.last_commit_sha)!.slice(0, 7)}</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-1 flex-wrap">
                          <span>{new Date(dep.created_at).toLocaleString()}</span>
                          {(dep.commit_message || (idx === 0 && service.last_commit_msg)) && (
                            <>
                              <span>•</span>
                              <span className="text-zinc-400 truncate max-w-sm sm:max-w-md lg:max-w-lg" title={dep.commit_message || service.last_commit_msg}>
                                {dep.commit_message || service.last_commit_msg}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!openLogTabIds.includes(dep.id)) {
                          setOpenLogTabIds((prev) => [...prev, dep.id]);
                        }
                        setSelectedDeploymentId(dep.id);
                        setActiveTab("logs");
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 gap-1.5 cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>View Logs</span>
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE LOGS */}
        {activeTab === "logs" && (
          <div className="flex-1 min-h-0 flex flex-col gap-3 pt-3 overflow-hidden">
            {/* Deployment switcher if open log tabs exist */}
            {openLogTabIds.length > 0 && service.deployments && (
              <div className="shrink-0 flex items-center justify-between bg-zinc-950/95 border border-zinc-800/90 backdrop-blur-md px-4 py-2 rounded-lg text-xs shadow-lg">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-zinc-400 font-mono">Viewing logs for:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {service.deployments
                      .filter((dep) => openLogTabIds.includes(dep.id))
                      .map((dep) => {
                        const originalIdx = service.deployments!.findIndex((d) => d.id === dep.id);
                        const depNum = service.deployments!.length - originalIdx;
                        const isSelected = dep.id === activeDeploymentId;
                        const isLatest = dep.id === service.deployments?.[0]?.id;
                        return (
                          <div
                            key={dep.id}
                            onClick={() => setSelectedDeploymentId(dep.id)}
                            className={`group/tab px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${isSelected
                                ? "bg-cyan-950/80 text-cyan-300 border border-cyan-700/70 shadow-sm"
                                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
                              }`}
                          >
                            <span>Deployment #{depNum}</span>
                            {(dep.commit_sha || (originalIdx === 0 && service.last_commit_sha)) && (
                              <span className="text-[10px] text-cyan-400 font-mono">
                                ({(dep.commit_sha || service.last_commit_sha)!.slice(0, 7)})
                              </span>
                            )}
                            <span
                              className={`text-[9px] px-1 rounded uppercase font-bold ${dep.status === "RUNNING"
                                  ? "bg-emerald-950/80 text-emerald-400"
                                  : dep.status === "BUILDING"
                                    ? "bg-amber-950/80 text-amber-400"
                                    : "text-zinc-500 bg-zinc-950"
                                }`}
                            >
                              {dep.status}
                            </span>
                            {!isLatest && (
                              <button
                                type="button"
                                onClick={(e) => handleCloseLogTab(e, dep.id)}
                                className="opacity-60 group-hover/tab:opacity-100 hover:bg-zinc-800/80 p-0.5 rounded transition-all text-zinc-400 hover:text-zinc-100 ml-0.5 cursor-pointer"
                                title={`Close Deployment #${depNum} tab`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {openLogTabIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (service?.deployments?.[0]?.id) {
                        setOpenLogTabIds([service.deployments[0].id]);
                        setSelectedDeploymentId(service.deployments[0].id);
                      }
                    }}
                    className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-850 transition-colors ml-auto cursor-pointer"
                    title="Close other tabs and keep latest"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <LogViewer
              fillHeight
              className="flex-1 min-h-0"
              logs={logs}
              isLoading={isFetchingLogs}
              onRefresh={fetchLogs}
              autoRefresh={autoRefreshLogs}
              onToggleAutoRefresh={setAutoRefreshLogs}
              title={
                selectedDeploymentNumber
                  ? `${service.name} - Deployment #${selectedDeploymentNumber} Logs`
                  : `${service.name} Logs`
              }
              subtitle={
                selectedDeployment?.status === "RUNNING"
                  ? "Live container application runtime stream"
                  : "Real-time build and execution stream from container engine"
              }
            />
          </div>
        )}

        {/* TAB 3: ENVIRONMENT VARIABLES */}
        {activeTab === "variables" && (
          <div className="space-y-6 max-w-4xl">
            {service.type === "DATABASE" && (() => {
              // Live-compute the connection string from current env vars in state
              const dbUser = envVars["POSTGRES_USER"] || envVars["MYSQL_USER"] || envVars["MONGO_INITDB_ROOT_USERNAME"] || "";
              const dbPass = envVars["POSTGRES_PASSWORD"] || envVars["MYSQL_ROOT_PASSWORD"] || envVars["MONGO_INITDB_ROOT_PASSWORD"] || "";
              const dbHost = envVars["POSTGRES_HOST"] || platformServiceHost(service.subdomain);
              const dbPort = envVars["POSTGRES_PORT"] || envVars["MYSQL_PORT"] || "5432";
              const dbName = envVars["POSTGRES_DB"] || envVars["MYSQL_DATABASE"] || envVars["MONGO_INITDB_DATABASE"] || "";
              const isMongo = !!envVars["MONGODB_URI"] || !!envVars["MONGO_INITDB_ROOT_USERNAME"];

              let computedUri = envVars["REDIS_URL"] || envVars["MONGODB_URI"] || "";
              if (!computedUri) {
                // Rebuild PostgreSQL/MySQL URI from parts
                const scheme = isMongo ? "mongodb" : "postgresql";
                if (dbUser && dbPass && dbHost && dbName) {
                  computedUri = `${scheme}://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
                } else {
                  computedUri = envVars["DATABASE_URL"] || "";
                }
              }

              return (
                <Card className="border-cyan-900/40 bg-cyan-950/10 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-white">Database Credentials &amp; Connection String</h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                      Auto-Configured
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Connection string is automatically updated when you change the environment variables below.
                  </p>

                  {/* Connection string URI only */}
                  {computedUri && (
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs flex items-center justify-between gap-3">
                      <div className="truncate text-zinc-300">
                        <span className="text-zinc-500 mr-2">URI:</span>
                        {computedUri}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(computedUri);
                          toast.success("Copied", { message: "Database connection string copied." });
                        }}
                        className="text-xs h-7 px-2 shrink-0 text-cyan-400 hover:text-cyan-300"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copy URI
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })()}

            <Card className="border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Service Environment Variables</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Variables set here are injected into this specific service container upon deployment.
                </p>
              </div>
              <EnvEditor
                initialEnvVars={envVars}
                onChange={(newVars) => {
                  markFieldEdited("env_vars");
                  // For database services: auto-rebuild DATABASE_URL from changed vars
                  if (service.type === "DATABASE") {
                    const user = newVars["POSTGRES_USER"] || newVars["MYSQL_USER"] || "";
                    const pass = newVars["POSTGRES_PASSWORD"] || newVars["MYSQL_ROOT_PASSWORD"] || "";
                    const host = newVars["POSTGRES_HOST"] || "";
                    const port = newVars["POSTGRES_PORT"] || "5432";
                    const db = newVars["POSTGRES_DB"] || newVars["MYSQL_DATABASE"] || "";
                    if (user && pass && host && db) {
                      newVars["DATABASE_URL"] = `postgresql://${user}:${pass}@${host}:${port}/${db}`;
                    }
                  }
                  setEnvVars(newVars);
                }}
                lockedKeys={service.type === "DATABASE" ? ["POSTGRES_HOST"] : []}
                hiddenKeys={service.type === "DATABASE" ? ["DATABASE_URL"] : []}
                hideDelete={service.type === "DATABASE"}
              />
            </Card>
          </div>
        )}

        {/* TAB: DATABASE MANAGER */}
        {activeTab === "database" && service && (
          <DatabaseManager service={service} projectId={projectId} />
        )}

        {/* TAB 4: SERVICE SETTINGS (Railway-style with sub-navigation) */}
        {activeTab === "settings" && (
          <div className="flex flex-col lg:flex-row items-start gap-10">
            {/* Main Content Sections with Railway-style timeline */}
            <div className="flex-1 min-w-0 space-y-12 w-full">

              {/* SECTION 1: SOURCE */}
              <div id="section-source" className="scroll-mt-60 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Source</h2>
                    <p className="text-xs text-zinc-400">Configure build source, repository connection, and service identity.</p>
                  </div>
                </div>

                <div className="space-y-4 pl-0 sm:pl-12">
                  <Card className="border-zinc-800/80 bg-zinc-950/60 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">
                        {service.source_type === "DOCKER" || service.type === "DATABASE" ? "Source Image" : "Source Repository"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-750 flex items-center justify-center text-zinc-400 shrink-0">
                          {service.source_type === "DOCKER" || service.type === "DATABASE" ? (
                            <Database className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Code2 className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold font-mono text-white truncate">
                            {service.source_type === "DOCKER" || service.type === "DATABASE"
                              ? (dockerImage || getEffectiveDockerImage(service))
                              : (service.repository_url ? cleanRepoUrl(service.repository_url) : service.name)}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-mono">
                            {service.source_type === "DOCKER" || service.type === "DATABASE"
                              ? "Container Image • Public Registry"
                              : (service.branch ? `Branch: ${service.branch} • Automated build triggers` : "Configured deployment source")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-300">Service Name</label>
                          <Input
                            value={name}
                            onChange={(e) => {
                              markFieldEdited("name");
                              setName(e.target.value);
                            }}
                            className="bg-zinc-900 border-zinc-800 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-300">Description</label>
                          <Input
                            value={description}
                            onChange={(e) => {
                              markFieldEdited("description");
                              setDescription(e.target.value);
                            }}
                            placeholder="Optional service description"
                            className="bg-zinc-900 border-zinc-800 text-xs"
                          />
                        </div>
                      </div>

                      {service.source_type === "GIT" && (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-zinc-300">Git Branch</label>
                              {isLoadingBranches && (
                                <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  Loading branches...
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <GitBranch className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <select
                                value={branch}
                                onChange={(e) => {
                                  markFieldEdited("branch");
                                  setBranch(e.target.value);
                                }}
                                disabled={isLoadingBranches}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-8 py-2 text-xs text-white focus:border-cyan-500/80 outline-none appearance-none cursor-pointer disabled:opacity-50 font-mono"
                              >
                                {Array.from(new Set([branch, ...availableBranches].filter(Boolean))).map((b) => (
                                  <option key={b} value={b} className="bg-zinc-900 text-white font-mono">
                                    {b}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          {/* Auto Redeploy on Git Commit */}
                          <div className="pt-2 border-t border-white/[0.06] space-y-3">
                            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span className="text-xs font-semibold text-white">Auto Redeploy on GitHub Push</span>
                                  {autoDeploy ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                  Layanan otomatis di-redeploy ketika ada commit terbaru di repository GitHub pada branch <code className="text-cyan-300 font-mono px-1 py-0.5 rounded bg-zinc-800/80 text-[10px]">{branch || "main"}</code> (pengecekan otomatis setiap 15 detik).
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  markFieldEdited("auto_deploy");
                                  setAutoDeploy(!autoDeploy);
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoDeploy ? "bg-emerald-500" : "bg-zinc-700"
                                  }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${autoDeploy ? "translate-x-4" : "translate-x-0"
                                    }`}
                                />
                              </button>
                            </div>

                            {/* Last Deployed Commit */}
                            {service.last_commit_sha && (
                              <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-zinc-900/40 border border-white/[0.06] text-xs font-mono">
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                  <GitCommit className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="text-zinc-400 text-[11px]">Commit Terakhir:</span>
                                  <a
                                    href={
                                      service.repository_url && service.repository_url.includes("github.com")
                                        ? `${service.repository_url.replace(/\.git$/, "")}/commit/${service.last_commit_sha}`
                                        : undefined
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 text-[11px] font-semibold transition-colors"
                                    title={`View commit on GitHub: ${service.last_commit_sha}`}
                                  >
                                    {service.last_commit_sha.slice(0, 7)}
                                  </a>
                                  {service.last_commit_msg && (
                                    <span className="text-zinc-300 text-[11px] truncate max-w-sm sm:max-w-md lg:max-w-lg" title={service.last_commit_msg}>
                                      {service.last_commit_msg}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              {/* SECTION 2: NETWORKING */}
              <div id="section-networking" className="scroll-mt-60 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                    <Network className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Networking</h2>
                    <p className="text-xs text-zinc-400">Port routing, internal cluster DNS, and proxy ingress configuration.</p>
                  </div>
                </div>

                <div className="space-y-4 pl-0 sm:pl-12">
                  <Card className="border-zinc-800/80 bg-zinc-950/60 p-5 space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Public Networking</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Make this service publicly accessible via HTTP, TCP, or both.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                          <label className="text-zinc-400 block text-[11px] uppercase tracking-wider font-semibold">
                            Container Listening Port
                          </label>
                          <Input
                            type="number"
                            value={containerPort || ""}
                            onChange={(e) => {
                              markFieldEdited("port");
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setContainerPort(val);
                            }}
                            className="bg-zinc-950 border-zinc-800 text-sm font-bold text-white font-mono h-9"
                          />
                          <span className="text-zinc-500 text-[11px] block">
                            The internal port your application server listens on (e.g. 3000, 8080, 3306).
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                          <span className="text-zinc-400 block text-[11px] uppercase tracking-wider font-semibold">
                            Assigned Host Ingress Port
                          </span>
                          <div className="h-9 px-3 rounded-lg bg-zinc-950 border border-white/[0.06] flex items-center">
                            <span className="text-cyan-400 text-sm font-bold">
                              {service.host_port ? `:${service.host_port}` : "Auto-assigned"}
                            </span>
                          </div>
                          <span className="text-zinc-500 text-[11px] block">
                            Direct TCP proxy reverse binding on the cluster host.
                          </span>
                        </div>
                      </div>

                      {/* Internal DNS Endpoint */}
                      <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                        <div className="min-w-0">
                          <span className="text-zinc-500 text-[11px] block uppercase tracking-wider">Private Cluster DNS</span>
                          <span className="text-cyan-300 font-semibold text-xs mt-0.5 block truncate">
                            {service.slug}:{service.container_port}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${service.slug}:${service.container_port}`);
                            toast.success("Copied", { message: "Internal DNS endpoint copied." });
                          }}
                          className="text-xs h-7 gap-1 border-zinc-800 text-zinc-400 hover:text-white shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Endpoint</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* SECTION 3: DOMAINS (Vercel-style UI via DomainManager) */}
              <div id="section-domains" className="scroll-mt-60 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Domains</h2>
                    <p className="text-xs text-zinc-400">
                      Manage subdomains, custom domains, and SSL certificates with Vercel-style DNS records.
                    </p>
                  </div>
                </div>

                <div className="pl-0 sm:pl-12">
                  <DomainManager
                    projectId={projectId}
                    projectName={project?.name || "app"}
                    serviceId={serviceId}
                    serviceName={service.name}
                    defaultDomain={platformServiceHost(service.subdomain) || undefined}
                    domains={domains}
                    onDomainsChange={fetchDomains}
                    onUpdateSubdomain={service.type === "DATABASE" ? undefined : handleUpdateSubdomain}
                    readOnly={service.type === "DATABASE"}
                  />
                </div>
              </div>

              {/* SECTION 4: RESOURCES */}
              <div id="section-resources" className="scroll-mt-60 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Resources</h2>
                    <p className="text-xs text-zinc-400">Configure CPU and Memory limits allocated to this service container.</p>
                  </div>
                </div>

                <div className="space-y-4 pl-0 sm:pl-12">
                  <Card className="border-zinc-800/80 bg-zinc-950/60 p-5 space-y-5">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                            <span>Memory Limit</span>
                            <span className="text-cyan-400 font-mono text-xs">{memoryMB} MB</span>
                          </label>
                          <Input
                            type="number"
                            value={memoryMB || ""}
                            onChange={(e) => {
                              markFieldEdited("memory");
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setMemoryMB(val);
                            }}
                            className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                            placeholder="512"
                            min="128"
                            step="128"
                          />
                          <p className="text-[11px] text-zinc-500">Dedicated RAM allocation for this container.</p>
                        </div>

                        <div className="space-y-2 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                            <span>CPU Cores</span>
                            <span className="text-cyan-400 font-mono text-xs">{cpus} CPU</span>
                          </label>
                          <Input
                            type="number"
                            value={cpus || ""}
                            onChange={(e) => {
                              markFieldEdited("cpus");
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setCpus(val);
                            }}
                            className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                            placeholder="0.5"
                            min="0.1"
                            step="0.1"
                          />
                          <p className="text-[11px] text-zinc-500">Fractional or dedicated CPU shares.</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* SECTION 5: DANGER ZONE */}
              <div id="section-danger" className="scroll-mt-60 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0 shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-rose-400 tracking-tight">Danger Zone</h2>
                    <p className="text-xs text-zinc-400">Irreversible actions and service deletion.</p>
                  </div>
                </div>

                <div className="pl-0 sm:pl-12">
                  <Card className="border-rose-900/40 bg-rose-950/10 p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-rose-300">Delete Service</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Permanently destroy this service container, active ports, ingress reverse proxies, and historical deployment logs. This action cannot be reversed.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-start">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowDeleteModal(true)}
                        className="gap-2 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Service</span>
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>

            </div>

            {/* Right Sticky TOC Menu (Railway Style) */}
            <aside className="hidden lg:block w-48 shrink-0 self-stretch">
              <div className="sticky top-44 p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-md space-y-1 shadow-xl">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2.5 py-1">
                  Service Settings
                </p>
                {[
                  { id: "source", label: "Source" },
                  { id: "networking", label: "Networking" },
                  { id: "domains", label: "Domains" },
                  { id: "resources", label: "Resources" },
                  { id: "danger", label: "Danger" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSettingsSection(item.id);
                      const el = document.getElementById(`section-${item.id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${activeSettingsSection === item.id
                        ? "text-cyan-400 bg-cyan-950/40 font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Delete Service Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteService}
        title="Delete Service"
        description={`Are you sure you want to delete service "${service.name}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Service"}
        variant="danger"
        isLoading={isDeleting}
        verificationKeyword={service.name}
      />

      {/* Railway-style Floating Apply Changes Bar */}
      {pendingChanges.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Details Popover */}
          {showChangesDetails && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[340px] sm:w-[420px] rounded-2xl bg-[#0d0a18]/95 border border-purple-500/40 p-4 shadow-2xl backdrop-blur-2xl z-50 text-left space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2.5 border-b border-purple-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-xs font-semibold text-purple-200 tracking-wide uppercase">
                    Pending Changes ({pendingChanges.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangesDetails(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {pendingChanges.map((change) => (
                  <div
                    key={change.id}
                    className="p-2.5 rounded-xl bg-zinc-900/80 border border-purple-950/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-zinc-200">{change.label}</p>
                      {change.description && (
                        <p className="text-[11px] text-purple-300/80 font-mono mt-0.5 break-all">
                          {change.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-purple-900/40 text-xs">
                <button
                  type="button"
                  onClick={handleDiscardAllChanges}
                  disabled={isApplyingChanges}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard all</span>
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApplyAllChanges}
                  disabled={isApplyingChanges}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs h-8 px-3.5 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                >
                  {isApplyingChanges ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      {needsRedeploy ? "Redeploying..." : "Applying..."}
                    </>
                  ) : (
                    needsRedeploy ? "Apply & Redeploy" : "Apply Changes"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Floating Pill Bar */}
          <div className="flex items-center p-1.5 pl-2.5 pr-1.5 gap-2 rounded-2xl bg-[#0a0714]/95 backdrop-blur-2xl border border-purple-500/40 shadow-[0_12px_45px_rgba(147,51,234,0.35)]">
            {/* Pill Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-700/50 text-purple-200 text-xs font-semibold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>
                Apply {pendingChanges.length} change{pendingChanges.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Details Button */}
            <button
              type="button"
              onClick={() => {
                setShowChangesDetails((prev) => !prev);
                setShowDiscardMenu(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${showChangesDetails
                  ? "bg-purple-900/50 text-white border border-purple-600/40"
                  : "text-zinc-300 hover:text-white hover:bg-white/5"
                }`}
            >
              <span>Details</span>
              <ChevronUp
                className={`w-3.5 h-3.5 transition-transform duration-150 ${showChangesDetails ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Apply Button with Shift+Enter hint */}
            <button
              type="button"
              onClick={handleApplyAllChanges}
              disabled={isApplyingChanges}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-purple-900/40 transition disabled:opacity-50 cursor-pointer"
            >
              {isApplyingChanges ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{needsRedeploy ? "Redeploying..." : "Applying..."}</span>
                </>
              ) : (
                <>
                  <span>{needsRedeploy ? "Apply & Redeploy" : "Apply"}</span>
                  <span className="text-[10px] font-mono opacity-85 bg-purple-700/80 px-1.5 py-0.5 rounded border border-purple-400/30">
                    ⇧+Enter
                  </span>
                </>
              )}
            </button>

            {/* Three dots / Discard Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowDiscardMenu((prev) => !prev);
                  setShowChangesDetails(false);
                }}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showDiscardMenu && (
                <div className="absolute bottom-full mb-2 right-0 w-44 rounded-xl bg-[#0e0c18] border border-purple-500/30 p-1 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={handleDiscardAllChanges}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Discard changes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
