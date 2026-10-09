"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { GithubIcon } from "@/components/ui/github-icon";
import { GitlabIcon } from "@/components/ui/gitlab-icon";
import { createServiceApi } from "@/lib/api/services";
import { createProjectDomainApi } from "@/lib/api/projects";
import { CreateServiceRequest, Service } from "@/types/service";
import { useToast } from "@/lib/toast/toast-context";
import { buildOAuthState } from "@/lib/auth/oauth-state";
import { PLATFORM_URL_SUFFIX } from "@/lib/platform";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Search,
  GitBranch,
  Database,
  Boxes,
  Cpu,
  RotateCw,
  Lock,
  Globe,
  ChevronRight,
  ChevronDown,
  Server,
  Zap,
  Gift,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Layers,
  Check,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onServiceCreated: (newService: Service) => void;
  initialTab?: "git" | "database" | "docker";
  initialServiceType?: "WEB" | "FRONTEND";
}

type FlowStep =
  | "SELECT_TYPE"
  | "GIT_PROVIDER"
  | "GITHUB_CONNECT"
  | "GITLAB_CONNECT"
  | "GITHUB_REPOS"
  | "GIT_BRANCH"
  | "DATABASE_SELECT";

interface GitHubRepoItem {
  id: number | string;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language?: string;
}

interface GitHubAuthData {
  type?: string;
  token?: string;
  username?: string;
}

interface GitLabAuthData {
  type?: string;
  token?: string;
  username?: string;
  name?: string;
  avatar_url?: string;
  web_url?: string;
  email?: string;
}

const DATABASE_PRESETS = [
  {
    id: "postgres",
    name: "PostgreSQL",
    version: "17.11",
    desc: "Powerful open source object-relational database",
    image: "postgres:17.11",
    port: 5432,
    badge: "Relational",
    color: "text-sky-400 bg-sky-950/40 border-sky-800/50",
  },
  {
    id: "mariadb",
    name: "MariaDB",
    version: "11.2",
    desc: "Fast, scalable open source relational database",
    image: "mariadb:11.2",
    port: 3306,
    badge: "Relational",
    color: "text-teal-400 bg-teal-950/40 border-teal-800/50",
  },
  {
    id: "mysql",
    name: "MySQL",
    version: "8.0",
    desc: "World's most popular open source relational database",
    image: "mysql:8.0",
    port: 3306,
    badge: "Relational",
    color: "text-amber-400 bg-amber-950/40 border-amber-800/50",
  },
  {
    id: "redis",
    name: "Redis",
    version: "7.2 Alpine",
    desc: "In-memory data structure store, cache & broker",
    image: "redis:7-alpine",
    port: 6379,
    badge: "Cache & Queue",
    color: "text-rose-400 bg-rose-950/40 border-rose-800/50",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    version: "7.0 Community",
    desc: "NoSQL document database built for high scalability",
    image: "mongo:7-jammy",
    port: 27017,
    badge: "Document NoSQL",
    color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  },
];

import { LanguageLogo } from "@/components/ui/language-logo";

interface ApplicationPresetItem {
  id: string;
  name: string;
  language: string;
  framework: string;
  port: number;
  type: "WEB" | "FRONTEND";
}

const APPLICATION_PRESETS: ApplicationPresetItem[] = [
  { id: "other", name: "Other", language: "Other", framework: "Other", port: 8080, type: "WEB" },
  { id: "html", name: "HTML", language: "HTML", framework: "Static HTML", port: 80, type: "FRONTEND" },
  { id: "nextjs", name: "Next.js", language: "Next.js", framework: "Next.js", port: 3000, type: "FRONTEND" },
  { id: "react", name: "React / Vite", language: "React", framework: "Vite / React", port: 3000, type: "FRONTEND" },
  { id: "nodejs", name: "Node.js", language: "Node.js", framework: "Node.js", port: 3000, type: "WEB" },
  { id: "go", name: "Go", language: "Go", framework: "Go Service", port: 8080, type: "WEB" },
  { id: "python", name: "Python", language: "Python", framework: "Python App", port: 8000, type: "WEB" },
  { id: "java", name: "Java", language: "Java", framework: "Java Spring Boot", port: 8080, type: "WEB" },
  { id: "rust", name: "Rust", language: "Rust", framework: "Rust Application", port: 8080, type: "WEB" },
  { id: "php", name: "PHP", language: "PHP", framework: "PHP / Apache", port: 80, type: "WEB" },
  { id: "docker", name: "Docker", language: "Docker", framework: "Custom Container", port: 8080, type: "WEB" },
];

function generateUniqueServiceName(baseName: string): string {
  const clean = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 20);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${clean || "service"}-${suffix}`;
}

const ENVIRONMENT_OPTIONS = [
  "Production and Preview",
  "Production",
  "Preview",
  "Development",
];

export function CreateServiceModal(props: CreateServiceModalProps) {
  if (!props.isOpen) return null;
  return <CreateServiceModalWizard {...props} />;
}

function CreateServiceModalWizard({
  onClose,
  projectId,
  onServiceCreated,
  initialTab = "git",
  initialServiceType = "WEB",
}: CreateServiceModalProps) {
  const toast = useToast();

  // Wizard navigation state
  const [step, setStep] = useState<FlowStep>(
    initialTab === "database" ? "DATABASE_SELECT" : "SELECT_TYPE"
  );
  const [history, setHistory] = useState<FlowStep[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useAuth();
  const [isManualRepo, setIsManualRepo] = useState(false);

  const getGithubStorageKey = useCallback(() => {
    return user?.id ? `kospaces_github_auth_${user.id}` : "kospaces_github_auth";
  }, [user?.id]);

  const getGitlabStorageKey = useCallback(() => {
    return user?.id ? `kospaces_gitlab_auth_${user.id}` : "kospaces_gitlab_auth";
  }, [user?.id]);

  // GitHub integration state (lazily read from user-scoped localStorage with fallback)
  const [githubAuth, setGithubAuth] = useState<GitHubAuthData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const userRaw = localStorage.getItem("kospaces_current_user");
      const currentUserId = userRaw ? JSON.parse(userRaw)?.id : null;
      const key = currentUserId ? `kospaces_github_auth_${currentUserId}` : "kospaces_github_auth";
      const saved = localStorage.getItem(key) || localStorage.getItem("kospaces_github_auth");
      if (saved && currentUserId) {
        try {
          localStorage.setItem(`kospaces_github_auth_${currentUserId}`, saved);
        } catch {}
      }
      return saved ? (JSON.parse(saved) as GitHubAuthData) : null;
    } catch {
      return null;
    }
  });
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GitHubRepoItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [manualRepoUrl, setManualRepoUrl] = useState("");
  const [manualGitToken, setManualGitToken] = useState("");

  // GitLab integration state (strictly user-scoped)
  const [gitlabUrl, setGitlabUrl] = useState("");
  const [gitProvider, setGitProvider] = useState<"github" | "gitlab">("github");
  const [isConnectingGitlab, setIsConnectingGitlab] = useState(false);
  const [gitlabAuth, setGitlabAuth] = useState<GitLabAuthData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const userRaw = localStorage.getItem("kospaces_current_user");
      const currentUserId = userRaw ? JSON.parse(userRaw)?.id : null;
      const key = currentUserId ? `kospaces_gitlab_auth_${currentUserId}` : "kospaces_gitlab_auth";
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as GitLabAuthData) : null;
    } catch {
      return null;
    }
  });
  const [personalAccessToken, setPersonalAccessToken] = useState("");
  const [showPersonalTokenInput, setShowPersonalTokenInput] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  // Sync auth when user changes
  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    try {
      const ghKey = `kospaces_github_auth_${user.id}`;
      const glKey = `kospaces_gitlab_auth_${user.id}`;
      const savedGh = localStorage.getItem(ghKey) || localStorage.getItem("kospaces_github_auth");
      if (savedGh) {
        localStorage.setItem(ghKey, savedGh);
      }
      setGithubAuth(savedGh ? (JSON.parse(savedGh) as GitHubAuthData) : null);
      const savedGl = localStorage.getItem(glKey);
      setGitlabAuth(savedGl ? (JSON.parse(savedGl) as GitLabAuthData) : null);
    } catch {
      // ignore
    }
  }, [user?.id]);

  const getStoredGithubAuth = useCallback((): GitHubAuthData | null => {
    if (typeof window === "undefined") return null;
    try {
      const key = getGithubStorageKey();
      const saved = localStorage.getItem(key) || localStorage.getItem("kospaces_github_auth");
      if (saved && user?.id) {
        localStorage.setItem(key, saved);
      }
      return saved ? (JSON.parse(saved) as GitHubAuthData) : null;
    } catch {
      return null;
    }
  }, [getGithubStorageKey, user?.id]);

  const getStoredGitlabAuth = useCallback((): GitLabAuthData | null => {
    if (typeof window === "undefined") return null;
    try {
      const key = getGitlabStorageKey();
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as GitLabAuthData) : null;
    } catch {
      return null;
    }
  }, [getGitlabStorageKey]);

  // Selected Service configuration
  const [selectedSourceType, setSelectedSourceType] = useState<"GIT" | "DATABASE">("GIT");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState<"WEB" | "FRONTEND">(initialServiceType);
  const [branch, setBranch] = useState("main");
  const [selectedDb, setSelectedDb] = useState<(typeof DATABASE_PRESETS)[0] | null>(null);

  // Repository Inspection state (Branches & Language / Runtime Detection)
  const [availableBranches, setAvailableBranches] = useState<string[]>(["main"]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("");
  const [detectedFramework, setDetectedFramework] = useState<string>("");
  const [detectedPort, setDetectedPort] = useState<number>(8080);
  const [isDetectingRuntime, setIsDetectingRuntime] = useState<boolean>(false);

  // Container port & custom domain pre-config sebelum deploy pertama.
  // Port default ikut hasil deteksi runtime; user bisa override.
  const [containerPort, setContainerPort] = useState<string>("8080");
  const [customDomain, setCustomDomain] = useState("");

  // Vercel-style deployment config (Root Directory & Environment Variables)
  const [rootDir, setRootDir] = useState("./");
  const [isEditingRootDir, setIsEditingRootDir] = useState(false);
  const [showEnvVars, setShowEnvVars] = useState(false);
  const [envVars, setEnvVars] = useState<{ id: string; key: string; value: string; environment?: string; showValue?: boolean }[]>([
    { id: "1", key: "", value: "", environment: "Production and Preview", showValue: false },
  ]);
  const [openEnvDropdownId, setOpenEnvDropdownId] = useState<string | null>(null);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showImportEnvModal, setShowImportEnvModal] = useState(false);
  const [pasteEnvText, setPasteEnvText] = useState("");

  // Root Directory Modal State & Fetching (Matching Screenshot 4)
  const [availableDirectories, setAvailableDirectories] = useState<{ name: string; path: string; depth: number }[]>([]);
  const [isLoadingDirectories, setIsLoadingDirectories] = useState(false);
  const [selectedDirectoryPath, setSelectedDirectoryPath] = useState("./");

  const openRootDirModal = async () => {
    setSelectedDirectoryPath(rootDir || "./");
    setIsEditingRootDir(true);

    if (!selectedRepo) return;
    setIsLoadingDirectories(true);
    try {
      if (gitProvider === "github") {
        const ghToken = githubAuth?.token;
        const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
        if (ghToken) headers["Authorization"] = `Bearer ${ghToken}`;
        const res = await fetch(
          `https://api.github.com/repos/${selectedRepo.full_name}/git/trees/${branch || selectedRepo.default_branch || "main"}?recursive=1`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tree)) {
            const dirs = data.tree
              .filter((item: { type: string; path: string }) => item.type === "tree")
              .map((item: { path: string }) => {
                const parts = item.path.split("/");
                return {
                  name: parts[parts.length - 1],
                  path: item.path,
                  depth: parts.length - 1,
                };
              });
            setAvailableDirectories(dirs);
          }
        }
      } else if (gitProvider === "gitlab") {
        const glToken = gitlabAuth?.token;
        const headers: Record<string, string> = {};
        if (glToken) headers["Authorization"] = `Bearer ${glToken}`;
        const res = await fetch(
          `https://gitlab.com/api/v4/projects/${selectedRepo.id}/repository/tree?recursive=true&ref=${branch || "main"}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const dirs = data
              .filter((item: { type: string; path: string }) => item.type === "tree")
              .map((item: { path: string; name?: string }) => {
                const parts = item.path.split("/");
                return {
                  name: item.name || parts[parts.length - 1],
                  path: item.path,
                  depth: parts.length - 1,
                };
              });
            setAvailableDirectories(dirs);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingDirectories(false);
    }
  };

  const addEnvVar = () => {
    setEnvVars((prev) => [
      ...prev,
      { id: String(Date.now()), key: "", value: "", environment: "Production and Preview", showValue: false },
    ]);
  };

  const removeEnvVar = (id: string) => {
    setEnvVars((prev) =>
      prev.length > 1 ? prev.filter((e) => e.id !== id) : [{ id: "1", key: "", value: "", environment: "Production and Preview", showValue: false }]
    );
  };

  const updateEnvVar = (id: string, field: "key" | "value" | "environment", val: string) => {
    setEnvVars((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    );
  };

  const toggleShowValue = (id: string) => {
    setEnvVars((prev) =>
      prev.map((e) => (e.id === id ? { ...e, showValue: !e.showValue } : e))
    );
  };

  const handleApplyImportEnv = () => {
    const lines = pasteEnvText.split("\n");
    const newVars: { id: string; key: string; value: string; showValue?: boolean }[] = [];
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        newVars.push({ id: `imported-${Date.now()}-${index}`, key, value: val, showValue: false });
      }
    });

    if (newVars.length > 0) {
      setEnvVars((prev) => {
        const existing = prev.filter((e) => e.key.trim() !== "");
        return [...existing, ...newVars];
      });
      setShowImportEnvModal(false);
      setPasteEnvText("");
      setShowEnvVars(true);
    }
  };

  const handleSelectPreset = (preset: (typeof APPLICATION_PRESETS)[0]) => {
    setDetectedLanguage(preset.language);
    setDetectedFramework(preset.framework);
    setDetectedPort(preset.port);
    setContainerPort(String(preset.port));
    setServiceType(preset.type);
    setShowPresetDropdown(false);
  };

  // Resource configuration (Step 5)
  const [cpu, setCpu] = useState<number>(0.5);
  const [memoryMB, setMemoryMB] = useState<number>(512);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigate forward
  const goToStep = useCallback((nextStep: FlowStep) => {
    setHistory((prev) => [...prev, step]);
    setStep(nextStep);
    setSearchQuery("");
    setError(null);
  }, [step]);

  // Navigate backward
  const handleBack = () => {
    if (history.length === 0) {
      onClose();
      return;
    }
    const previousStep = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setStep(previousStep);
    setSearchQuery("");
    setError(null);
  };

  // Inspect repository to fetch real branches and detect language/framework/port
  const inspectRepository = useCallback(
    async (repo: GitHubRepoItem, provider: "github" | "gitlab") => {
      // 1. Fetch real branches from repository API
      setIsLoadingBranches(true);
      const initialBranch = repo.default_branch || "main";
      setAvailableBranches([initialBranch]);
      setBranch(initialBranch);

      try {
        let fetchedBranches: string[] = [];
        if (provider === "github") {
          const ghToken = githubAuth?.token;
          const headers: Record<string, string> = {
            Accept: "application/vnd.github.v3+json",
          };
          if (ghToken) {
            headers["Authorization"] = `Bearer ${ghToken}`;
          }
          const res = await fetch(
            `https://api.github.com/repos/${repo.full_name}/branches?per_page=100`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              fetchedBranches = data.map((b: { name: string }) => b.name);
            }
          }
        } else if (provider === "gitlab") {
          const glToken = gitlabAuth?.token;
          const headers: Record<string, string> = {};
          if (glToken) {
            headers["Authorization"] = `Bearer ${glToken}`;
          }
          const res = await fetch(
            `https://gitlab.com/api/v4/projects/${repo.id}/repository/branches?per_page=100`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              fetchedBranches = data.map((b: { name: string }) => b.name);
            }
          }
        }

        if (fetchedBranches.length > 0) {
          setAvailableBranches(fetchedBranches);
          if (fetchedBranches.includes(repo.default_branch)) {
            setBranch(repo.default_branch);
          } else {
            setBranch(fetchedBranches[0]);
          }
        } else {
          setAvailableBranches([initialBranch]);
          setBranch(initialBranch);
        }
      } catch {
        setAvailableBranches([initialBranch, "master", "develop"]);
      } finally {
        setIsLoadingBranches(false);
      }

      // 2. Automatically detect language, framework, and port
      setIsDetectingRuntime(true);
      try {
        let language = "";
        let framework = "";
        let port = 8080;
        let sType: "WEB" | "FRONTEND" = "WEB";

        if (provider === "github") {
          const ghToken = githubAuth?.token;
          const headers: Record<string, string> = {
            Accept: "application/vnd.github.v3+json",
          };
          if (ghToken) {
            headers["Authorization"] = `Bearer ${ghToken}`;
          }

          let fileNames: string[] = [];
          try {
            const contentsRes = await fetch(
              `https://api.github.com/repos/${repo.full_name}/contents?ref=${repo.default_branch || "main"}`,
              { headers }
            );
            if (contentsRes.ok) {
              const contents = await contentsRes.json();
              if (Array.isArray(contents)) {
                fileNames = contents.map((c: { name: string }) => c.name.toLowerCase());
              }
            }
          } catch {
            // ignore
          }

          let languagesMap: Record<string, number> = {};
          try {
            const langRes = await fetch(
              `https://api.github.com/repos/${repo.full_name}/languages`,
              { headers }
            );
            if (langRes.ok) {
              languagesMap = await langRes.json();
            }
          } catch {
            // ignore
          }

          const topLanguage = Object.keys(languagesMap)[0] || repo.language || "";

          if (fileNames.includes("index.html") || fileNames.includes("index.htm") || topLanguage.toLowerCase() === "html") {
            language = "HTML";
            framework = "Static HTML";
            port = 80;
            sType = "FRONTEND";
          } else if (fileNames.includes("go.mod") || fileNames.some((f) => f.endsWith(".go")) || topLanguage === "Go") {
            language = "Go";
            framework = fileNames.includes("main.go") ? "Go Application" : "Go Service";
            port = 8080;
            sType = "WEB";
          } else if (fileNames.includes("package.json")) {
            language = topLanguage.includes("TypeScript") ? "TypeScript" : "JavaScript";
            if (fileNames.some((f) => f.startsWith("next.config"))) {
              framework = "Next.js";
              port = 3000;
              sType = "FRONTEND";
            } else if (fileNames.some((f) => f.startsWith("vite.config"))) {
              framework = "Vite / React";
              port = 3000;
              sType = "FRONTEND";
            } else if (fileNames.some((f) => f.startsWith("nest-cli"))) {
              framework = "NestJS";
              port = 3000;
              sType = "WEB";
            } else if (fileNames.some((f) => f.startsWith("nuxt.config"))) {
              framework = "Nuxt.js";
              port = 3000;
              sType = "FRONTEND";
            } else {
              framework = "Node.js";
              port = 3000;
              sType = repo.name.includes("front") || repo.name.includes("web") ? "FRONTEND" : "WEB";
            }
          } else if (
            fileNames.includes("requirements.txt") ||
            fileNames.includes("pyproject.toml") ||
            fileNames.includes("pipfile") ||
            topLanguage === "Python"
          ) {
            language = "Python";
            framework = "Python App";
            port = 8000;
            sType = "WEB";
          } else if (fileNames.includes("pom.xml") || fileNames.includes("build.gradle") || topLanguage === "Java") {
            language = "Java";
            framework = "Java Spring Boot";
            port = 8080;
            sType = "WEB";
          } else if (fileNames.includes("cargo.toml") || topLanguage === "Rust") {
            language = "Rust";
            framework = "Rust Application";
            port = 8080;
            sType = "WEB";
          } else if (fileNames.includes("composer.json") || topLanguage === "PHP") {
            language = "PHP";
            framework = "PHP / Laravel";
            port = 8000;
            sType = "WEB";
          } else if (fileNames.includes("dockerfile")) {
            language = "Docker";
            framework = "Custom Container";
            port = 8080;
            sType = "WEB";
          } else if (topLanguage) {
            language = topLanguage;
            framework = `${topLanguage} Service`;
            port = 8080;
            sType = "WEB";
          }
        } else if (provider === "gitlab") {
          const glToken = gitlabAuth?.token;
          const headers: Record<string, string> = {};
          if (glToken) {
            headers["Authorization"] = `Bearer ${glToken}`;
          }

          let fileNames: string[] = [];
          try {
            const treeRes = await fetch(
              `https://gitlab.com/api/v4/projects/${repo.id}/repository/tree?ref=${repo.default_branch || "main"}`,
              { headers }
            );
            if (treeRes.ok) {
              const tree = await treeRes.json();
              if (Array.isArray(tree)) {
                fileNames = tree.map((t: { name: string }) => t.name.toLowerCase());
              }
            }
          } catch {
            // ignore
          }

          let languagesMap: Record<string, number> = {};
          try {
            const langRes = await fetch(
              `https://gitlab.com/api/v4/projects/${repo.id}/languages`,
              { headers }
            );
            if (langRes.ok) {
              languagesMap = await langRes.json();
            }
          } catch {
            // ignore
          }

          const topLanguage = Object.keys(languagesMap)[0] || repo.language || "";

          if (fileNames.includes("index.html") || fileNames.includes("index.htm") || topLanguage.toLowerCase() === "html") {
            language = "HTML";
            framework = "Static HTML";
            port = 80;
            sType = "FRONTEND";
          } else if (fileNames.includes("go.mod") || fileNames.some((f) => f.endsWith(".go")) || topLanguage === "Go") {
            language = "Go";
            framework = "Go Application";
            port = 8080;
            sType = "WEB";
          } else if (fileNames.includes("package.json")) {
            language = topLanguage.includes("TypeScript") ? "TypeScript" : "JavaScript";
            if (fileNames.some((f) => f.startsWith("next.config"))) {
              framework = "Next.js";
              port = 3000;
              sType = "FRONTEND";
            } else if (fileNames.some((f) => f.startsWith("vite.config"))) {
              framework = "Vite / React";
              port = 3000;
              sType = "FRONTEND";
            } else {
              framework = "Node.js";
              port = 3000;
              sType = repo.name.includes("front") || repo.name.includes("web") ? "FRONTEND" : "WEB";
            }
          } else if (
            fileNames.includes("requirements.txt") ||
            fileNames.includes("pyproject.toml") ||
            topLanguage === "Python"
          ) {
            language = "Python";
            framework = "Python App";
            port = 8000;
            sType = "WEB";
          } else if (topLanguage) {
            language = topLanguage;
            framework = `${topLanguage} Service`;
            port = 8080;
            sType = "WEB";
          }
        }

        // Standardize HTML detection
        if (language.toLowerCase() === "html" || framework.toLowerCase().includes("html")) {
          language = "HTML";
          framework = "Static HTML";
          port = 80;
          sType = "FRONTEND";
        }

        // Fallback by repository naming convention if nothing detected from API
        if (!language) {
          const lowerName = repo.name.toLowerCase();
          if (lowerName.includes("html")) {
            language = "HTML";
            framework = "Static HTML";
            port = 80;
            sType = "FRONTEND";
          } else if (lowerName.includes("next") || lowerName.includes("front") || lowerName.includes("web") || lowerName.includes("ui")) {
            language = "Node.js";
            framework = "Frontend Web";
            port = 3000;
            sType = "FRONTEND";
          } else if (lowerName.includes("cli") || lowerName.includes("go") || lowerName.includes("api") || lowerName.includes("backend")) {
            language = "Go";
            framework = "Go Service";
            port = 8080;
            sType = "WEB";
          } else {
            language = "Other";
            framework = "Other";
            port = 8080;
            sType = "WEB";
          }
        }

        setDetectedLanguage(language);
        setDetectedFramework(framework);
        setDetectedPort(port);
        setContainerPort(String(port));
        setServiceType(sType);
      } catch {
        const isHtml = repo.name.toLowerCase().includes("html") || (repo.language && repo.language.toLowerCase() === "html");
        const isFrontend = isHtml || repo.name.includes("front") || repo.name.includes("web");
        setDetectedLanguage(isHtml ? "HTML" : isFrontend ? "Next.js" : "Other");
        setDetectedFramework(isHtml ? "Static HTML" : isFrontend ? "Frontend Web" : "Other");
        setDetectedPort(isHtml ? 80 : isFrontend ? 3000 : 8080);
        setContainerPort(String(isHtml ? 80 : isFrontend ? 3000 : 8080));
        setServiceType(isFrontend ? "FRONTEND" : "WEB");
      } finally {
        setIsDetectingRuntime(false);
      }
    },
    [githubAuth?.token, gitlabAuth?.token]
  );

  // Fetch repositories from GitHub
  const fetchGithubRepos = useCallback(async (token?: string, username?: string) => {
    setIsLoadingRepos(true);
    setError(null);
    try {
      // Tanpa kredensial: jangan tampilkan data palsu — arahkan ke connect.
      if (!token && !username) {
        setGithubRepos([]);
        setError("GitHub is not connected. Connect your GitHub account to pick a repository.");
        goToStep("GITHUB_CONNECT");
        return;
      }

      const url = token
        ? "https://api.github.com/user/repos?sort=updated&per_page=100"
        : `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`;
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });

      if (res.status === 401) {
        // Token kedaluwarsa/dicabut — bersihkan state dan minta reconnect.
        try {
          localStorage.removeItem(getGithubStorageKey());
          localStorage.removeItem("kospaces_github_auth");
        } catch {}
        setGithubAuth(null);
        setGithubRepos([]);
        setError("Your GitHub token has expired or was revoked. Please reconnect your account.");
        toast.error("GitHub Disconnected", { message: "Token expired — please reconnect your account." });
        goToStep("GITHUB_CONNECT");
        return;
      }

      if (res.status === 403) {
        setGithubRepos([]);
        setError("GitHub API rate limit reached (HTTP 403). Wait a few minutes, then click the refresh icon.");
        toast.error("GitHub Rate Limited", { message: "Too many requests — try again in a few minutes." });
        return;
      }

      if (!res.ok) {
        setGithubRepos([]);
        setError(`GitHub API error (HTTP ${res.status}). Click the refresh icon to retry.`);
        toast.error("GitHub Error", { message: `GitHub API returned HTTP ${res.status}` });
        return;
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        setGithubRepos([]);
        setError("Unexpected response from GitHub API. Click the refresh icon to retry.");
        return;
      }

      setGithubRepos(
        data.map((r: { id: number; name: string; full_name: string; private: boolean; html_url: string; clone_url: string; default_branch: string; language?: string }) => {
          let cloneUrl = r.clone_url;
          if (token && (r.private || cloneUrl.includes("github.com"))) {
            cloneUrl = cloneUrl.replace("https://", `https://x-access-token:${token}@`);
          }
          return {
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            private: Boolean(r.private),
            html_url: r.html_url,
            clone_url: cloneUrl,
            default_branch: r.default_branch || "main",
            language: r.language || undefined,
          };
        })
      );
    } catch (err: unknown) {
      // Jangan telan error — user perlu tahu kenapa daftar repo kosong.
      // "Failed to fetch" umumnya: koneksi putus, ekstensi yang memblokir
      // api.github.com, atau CSP yang belum mengizinkan domain tersebut.
      const raw = err instanceof Error ? err.message : "Failed to load GitHub repositories";
      const msg =
        raw === "Failed to fetch"
          ? "Could not reach api.github.com. Check your internet connection, browser extensions that block GitHub, or the app CSP configuration."
          : raw;
      setGithubRepos([]);
      setError(msg);
      toast.error("GitHub Error", { message: msg });
    } finally {
      setIsLoadingRepos(false);
    }
  }, [getGithubStorageKey, goToStep, toast]);

  // Fetch repositories from GitLab using user's OAuth access token
  const fetchGitlabRepos = useCallback(
    async (tokenOverride?: string) => {
      setIsLoadingRepos(true);
      setError(null);
      setGitProvider("gitlab");

      const effectiveToken = tokenOverride || gitlabAuth?.token;

      if (!effectiveToken) {
        setIsLoadingRepos(false);
        setIsConnectingGitlab(false);
        goToStep("GITLAB_CONNECT");
        return;
      }

      try {
        const res = await fetch(
          "https://gitlab.com/api/v4/projects?membership=true&simple=true&per_page=100&order_by=updated_at",
          {
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
            },
          }
        );

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem(getGitlabStorageKey());
            setGitlabAuth(null);
            goToStep("GITLAB_CONNECT");
            throw new Error("GitLab token expired or unauthorized (HTTP 401). Please reconnect your GitLab account.");
          }
          throw new Error(`GitLab API error: HTTP ${res.status}`);
        }

        const projects = await res.json();
        if (Array.isArray(projects)) {
          setGithubRepos(
            projects.map((p: { id: number; name: string; path_with_namespace: string; visibility: string; http_url_to_repo: string; web_url: string; default_branch: string }) => ({
              id: p.id,
              name: p.name,
              full_name: p.path_with_namespace,
              private: p.visibility === "private",
              html_url: p.web_url,
              clone_url:
                p.visibility === "private"
                  ? p.http_url_to_repo.replace("https://", `https://oauth2:${effectiveToken}@`)
                  : p.http_url_to_repo,
              default_branch: p.default_branch || "main",
            }))
          );
          goToStep("GITHUB_REPOS");
          return;
        }

        throw new Error("Invalid response format from GitLab API");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load GitLab repositories";
        setError(msg);
        toast.error("GitLab Error", { message: msg });
      } finally {
        setIsLoadingRepos(false);
        setIsConnectingGitlab(false);
      }
    },
    [gitlabAuth?.token, goToStep, toast]
  );

  // Listen for OAuth message from GitHub / GitLab popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // T-9 audit: hanya terima pesan dari origin aplikasi sendiri (anti token injection).
      if (event.origin !== window.location.origin) return;
      if (
        event.data?.type === "GITHUB_AUTH_SUCCESS" ||
        event.data?.type === "KOSPACES_GITHUB_AUTH_SUCCESS"
      ) {
        const authData = event.data.data || event.data.github_auth || event.data.payload;
        if (authData) {
          try {
            localStorage.setItem(getGithubStorageKey(), JSON.stringify(authData));
            setGithubAuth(authData);
            setIsConnectingGithub(false);
            toast.success("GitHub Connected", {
              message: "Account linked successfully.",
            });
            fetchGithubRepos(authData.token, authData.username);
            goToStep("GITHUB_REPOS");
          } catch {
            // ignore
          }
        }
      }

      if (
        event.data?.type === "GITLAB_AUTH_SUCCESS" ||
        event.data?.type === "KOSPACES_GITLAB_AUTH_SUCCESS"
      ) {
        const authData = event.data.data || event.data.gitlab_auth || event.data.payload;
        if (authData) {
          try {
            localStorage.setItem(getGitlabStorageKey(), JSON.stringify(authData));
            setGitlabAuth(authData);
            setIsConnectingGitlab(false);
            toast.success("GitLab Connected", {
              message: `Connected as @${authData.username || "user"}`,
            });
            fetchGitlabRepos(authData.token);
            goToStep("GITHUB_REPOS");
          } catch {
            // ignore
          }
        }
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [fetchGithubRepos, fetchGitlabRepos, goToStep, toast]);

  // Connect GitHub popup
  const handleConnectGithub = async () => {
    setIsConnectingGithub(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
      let clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

      if (!clientId) {
        try {
          const res = await fetch(`${backendUrl}/auth/config`);
          if (res.ok) {
            const cfg = await res.json();
            clientId = cfg?.data?.github_app_client_id || cfg?.data?.github_client_id;
          }
        } catch {
          // ignore
        }
      }

      if (!clientId) {
        // Tidak ada kredensial GitHub yang dikonfigurasi —
        // jangan fallback ke client ID hardcoded (tidak aman untuk production).
        setIsConnectingGithub(false);
        setError("GitHub belum dikonfigurasi. Set GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET di backend.");
        return;
      }

      const redirectUri = `${window.location.origin}/api/auth/callback/github`;
      const scope = "repo,read:user,user:email";
      // State double-submit cookie — divalidasi di callback (K-2 audit).
      const oauthState = buildOAuthState("link");
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
        scope
      )}&state=${encodeURIComponent(oauthState)}`;

      const width = 600;
      const height = 720;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        "GitHub Authorization",
        `toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=no,copyhistory=no,width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = authUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open GitHub authorization";
      setError(msg);
      toast.error("GitHub Auth Error", { message: msg });
      setIsConnectingGithub(false);
    }
  };

  // Connect GitLab popup (OAuth 2.0 or prompt)
  const handleConnectGitlab = async () => {
    setIsConnectingGitlab(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
      const res = await fetch(`${backendUrl}/auth/config`);
      const cfg = await res.json();
      const gitlabClientId = cfg?.data?.gitlab_client_id;

      if (gitlabClientId) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const redirectUri = `${window.location.origin}/api/auth/callback/gitlab`;
        // State double-submit cookie — divalidasi di callback (K-2 audit).
        const gitlabState = buildOAuthState("link");
        const gitlabAuthUrl = `https://gitlab.com/oauth/authorize?client_id=${encodeURIComponent(
          gitlabClientId
        )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read_user+read_repository+api&state=${encodeURIComponent(gitlabState)}`;

        window.open(
          gitlabAuthUrl,
          "GitLab Authorization",
          `toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=no,copyhistory=no,width=${width},height=${height},top=${top},left=${left}`
        );
        return;
      }

      // If no OAuth App configured in backend yet, show Personal Access Token input so any account can connect!
      setShowPersonalTokenInput(true);
    } catch {
      setShowPersonalTokenInput(true);
    } finally {
      setTimeout(() => setIsConnectingGitlab(false), 2000);
    }
  };

  // Verify and save custom personal access token
  const handleVerifyAndSaveToken = async () => {
    const trimmed = personalAccessToken.trim();
    if (!trimmed) {
      setError("Please enter your GitLab Personal Access Token");
      return;
    }
    setIsVerifyingToken(true);
    setError(null);
    try {
      const userRes = await fetch("https://gitlab.com/api/v4/user", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (!userRes.ok) {
        throw new Error("Invalid GitLab token. Please ensure it has 'read_user' and 'read_repository' scopes.");
      }
      const user = await userRes.json();
      const authData: GitLabAuthData = {
        token: trimmed,
        username: user.username,
        name: user.name,
        avatar_url: user.avatar_url,
        web_url: user.web_url,
        email: user.email,
      };
      localStorage.setItem(getGitlabStorageKey(), JSON.stringify(authData));
      setGitlabAuth(authData);
      toast.success("GitLab Connected", {
        message: `Connected as @${user.username}`,
      });
      fetchGitlabRepos(trimmed);
      goToStep("GITHUB_REPOS");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify GitLab token";
      setError(msg);
      toast.error("GitLab Error", { message: msg });
    } finally {
      setIsVerifyingToken(false);
    }
  };

  // Disconnect GitLab
  const handleDisconnectGitlab = () => {
    localStorage.removeItem(getGitlabStorageKey());
    setGitlabAuth(null);
    setPersonalAccessToken("");
    setShowPersonalTokenInput(false);
    toast.info("GitLab Disconnected", {
      message: "You can now connect to another GitLab account.",
    });
  };

  // Disconnect GitHub
  const handleDisconnectGithub = () => {
    try {
      localStorage.removeItem(getGithubStorageKey());
      localStorage.removeItem("kospaces_github_auth");
    } catch {}
    setGithubAuth(null);
    setGithubRepos([]);
    toast.info("GitHub Disconnected", {
      message: "You can now connect to another GitHub account.",
    });
    goToStep("GITHUB_CONNECT");
  };

  // Choose GitHub in provider list
  const handleSelectGithubProvider = () => {
    setGitProvider("github");
    const auth = githubAuth || getStoredGithubAuth();
    if (auth && (auth.token || auth.username)) {
      fetchGithubRepos(auth.token, auth.username);
      goToStep("GITHUB_REPOS");
    } else {
      goToStep("GITHUB_CONNECT");
    }
  };

  // Choose GitLab in provider list
  const handleSelectGitlabProvider = () => {
    setGitProvider("gitlab");
    const auth = gitlabAuth || getStoredGitlabAuth();
    if (auth && (auth.token || auth.username)) {
      fetchGitlabRepos(auth.token);
      goToStep("GITHUB_REPOS");
    } else {
      goToStep("GITLAB_CONNECT");
    }
  };

  // Submit GitLab repository manually
  const handleGitlabContinue = () => {
    setError(null);
    const trimmedUrl = gitlabUrl.trim();
    if (!trimmedUrl) {
      setError("Please enter a GitLab repository URL");
      return;
    }
    const cleanUrl = trimmedUrl.replace(/\.git$/, "");
    const parts = cleanUrl.split("/");
    const repoName = parts[parts.length - 1] || "gitlab-service";

    let cloneUrl = trimmedUrl.endsWith(".git") ? trimmedUrl : `${trimmedUrl}.git`;
    const token = gitlabAuth?.token || "";
    if (token && cloneUrl.startsWith("https://")) {
      cloneUrl = cloneUrl.replace("https://", `https://oauth2:${token}@`);
    }

    const repoItem: GitHubRepoItem = {
      id: trimmedUrl,
      name: repoName,
      full_name: parts.slice(-2).join("/"),
      private: Boolean(token),
      html_url: trimmedUrl,
      clone_url: cloneUrl,
      default_branch: "main",
    };

    setGitProvider("gitlab");
    setIsManualRepo(true);
    setSelectedRepo(repoItem);
    setServiceName(generateUniqueServiceName(repoName));
    setBranch(repoItem.default_branch || "main");
    goToStep("GIT_BRANCH");
    inspectRepository(repoItem, "gitlab");
  };

  // Choose Repo
  const handleSelectRepo = (repo: GitHubRepoItem) => {
    setIsManualRepo(false);
    setSelectedRepo(repo);
    setServiceName(generateUniqueServiceName(repo.name));
    setBranch(repo.default_branch || "main");
    goToStep("GIT_BRANCH");
    inspectRepository(repo, gitProvider);
  };

  // Choose Database
  const handleSelectDatabasePreset = (preset: (typeof DATABASE_PRESETS)[0]) => {
    setSelectedDb(preset);
    setServiceName(generateUniqueServiceName(`${preset.id}-db`));
    setSelectedSourceType("DATABASE");
  };

  // Final Deploy Submit
  const handleFinalSubmit = async () => {
    setError(null);
    const trimmedName = serviceName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!trimmedName) {
      setError("Please provide a valid service name (letters, numbers, and hyphens)");
      return;
    }

    let payload: CreateServiceRequest;

    if (selectedSourceType === "DATABASE") {
      if (!selectedDb) {
        setError("Please select a database");
        return;
      }
      payload = {
        name: trimmedName,
        description: `${selectedDb.name} Managed Database`,
        type: "DATABASE",
        source_type: "DOCKER",
        docker_image: selectedDb.image,
        container_port: selectedDb.port,
        memory_mb: Number(memoryMB) || undefined,
        cpus: Number(cpu) || undefined,
      };
    } else {
      let repoUrl = (selectedRepo?.clone_url || manualRepoUrl).trim();
      if (!repoUrl) {
        setError("Repository URL is required");
        return;
      }

      // Inject token if manual token or stored auth token exists
      if (manualGitToken.trim()) {
        const tokenVal = manualGitToken.trim();
        if (!repoUrl.includes("@")) {
          if (repoUrl.includes("github.com")) {
            repoUrl = repoUrl.replace("https://github.com/", `https://x-access-token:${tokenVal}@github.com/`);
          } else if (repoUrl.includes("gitlab.com")) {
            repoUrl = repoUrl.replace("https://gitlab.com/", `https://oauth2:${tokenVal}@gitlab.com/`);
          } else {
            repoUrl = repoUrl.replace("https://", `https://${tokenVal}@`);
          }
        }
      } else {
        const effectiveGithubToken = githubAuth?.token;
        if (effectiveGithubToken && repoUrl.includes("github.com") && !repoUrl.includes("@")) {
          repoUrl = repoUrl.replace("https://github.com/", `https://x-access-token:${effectiveGithubToken}@github.com/`);
        }

        const effectiveGitlabToken = gitlabAuth?.token;
        if (effectiveGitlabToken && repoUrl.includes("gitlab.com") && !repoUrl.includes("@")) {
          repoUrl = repoUrl.replace("https://gitlab.com/", `https://oauth2:${effectiveGitlabToken}@gitlab.com/`);
        }
      }
      const parsedEnv: Record<string, string> = {};
      envVars.forEach((item) => {
        const k = item.key.trim();
        if (k) {
          parsedEnv[k] = item.value;
        }
      });

      const finalContainerPort =
        Number(containerPort) ||
        (detectedLanguage === "HTML" ? 80 : Number(detectedPort) || (serviceType === "FRONTEND" ? 3000 : 8080));

      payload = {
        name: trimmedName,
        type: serviceType,
        source_type: "GIT",
        repository_url: repoUrl,
        branch: branch || "main",
        root_dir: rootDir.trim() && rootDir.trim() !== "./" ? rootDir.trim() : undefined,
        env_vars: Object.keys(parsedEnv).length > 0 ? parsedEnv : undefined,
        container_port: finalContainerPort,
        memory_mb: Number(memoryMB) || undefined,
        cpus: Number(cpu) || undefined,
      };
    }

    setIsSubmitting(true);
    try {
      const newService = await createServiceApi(projectId, payload);

      // Custom domain opsional saat pembuatan service: langsung ter-attach
      // dan menunggu verifikasi DNS. Gagal di sini tidak membatalkan service
      // yang sudah dibuat.
      const trimmedDomain = customDomain.trim().toLowerCase();
      if (trimmedDomain && newService?.id) {
        try {
          await createProjectDomainApi(projectId, {
            domain: trimmedDomain,
            type: "CUSTOM",
            service_id: newService.id,
          });
          toast.success("Custom domain ditambahkan", {
            message: `Arahkan DNS ${trimmedDomain} ke platform, lalu pantau status verifikasinya di halaman Domains.`,
          });
        } catch {
          toast.error("Custom domain gagal ditambahkan", {
            message: "Service tetap dibuat. Tambahkan domain kapan saja lewat halaman Domains.",
          });
        }
      }
      toast.success("Service Created", {
        message: `Service "${newService.name}" deployed to project.`,
      });
      onServiceCreated(newService);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deploy service";
      setError(msg);
      if (msg.includes("PLAN_LIMIT_REACHED")) {
        toast.error("Plan Limit Reached", {
          message: "Your current plan has reached its service quota. Upgrade to deploy additional services.",
        });
      } else {
        toast.error("Deploy Failed", { message: msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered lists
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return githubRepos;
    return githubRepos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [githubRepos, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-[480px] rounded-2xl border border-zinc-800/90 bg-[#0c0d12] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top cyan laser glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850/80 bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {step !== "SELECT_TYPE" && (
              <button
                type="button"
                onClick={handleBack}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer mr-1"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 flex items-center justify-center shrink-0">
              {step === "DATABASE_SELECT" ? (
                <Database className="w-4 h-4" />
              ) : step === "GIT_PROVIDER" || step === "GITHUB_REPOS" || step === "GIT_BRANCH" ? (
                <GitBranch className="w-4 h-4" />
              ) : (
                <Boxes className="w-4 h-4" />
              )}
            </div>

            <h3 className="text-sm font-semibold text-white tracking-tight truncate">
              {step === "SELECT_TYPE" && "Select what to deploy"}
              {step === "GIT_PROVIDER" && "Git"}
              {step === "GITHUB_CONNECT" && "Connect GitHub"}
              {step === "GITLAB_CONNECT" && "Connect GitLab"}
              {step === "GITHUB_REPOS" && (gitProvider === "gitlab" ? "GitLab — Select repository" : "GitHub — Select repository")}
              {step === "GIT_BRANCH" && `${selectedRepo?.name || "Repository"} — Select branch & deploy`}
              {step === "DATABASE_SELECT" && "Database — Select database type"}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {step === "GITHUB_REPOS" && (
              <button
                type="button"
                onClick={() => {
                  if (gitProvider === "gitlab") {
                    fetchGitlabRepos();
                  } else {
                    fetchGithubRepos(githubAuth?.token, githubAuth?.username);
                  }
                }}
                className="p-1 text-zinc-400 hover:text-white rounded transition-colors"
                title="Refresh repositories"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoadingRepos ? "animate-spin" : ""}`} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs text-zinc-300">
          {error && (
            error.includes("PLAN_LIMIT_REACHED") ? (
              <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-zinc-950 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>Service Limit Reached</span>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
                        Upgrade Required
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed max-w-md">
                      Your current plan has reached its service capacity limit. Upgrade to <strong>Developer</strong> or <strong>Professional</strong> to deploy additional databases, web services, and apps.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:self-center shrink-0 pt-1 sm:pt-0">
                  <Link
                    href="/workspace/upgrade?plan=developer"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] cursor-pointer"
                  >
                    <span>Upgrade Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="leading-snug">{error.replace(/^Failed to create service:\s*/i, "")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="p-1 text-rose-400 hover:text-rose-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          )}

          {/* =======================================================
              STEP 1: SELECT WHAT TO DEPLOY (Screenshot 1)
          ======================================================= */}
          {step === "SELECT_TYPE" && (
            <div className="space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search all deployments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/80 outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                {/* 1. Git */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSourceType("GIT");
                    goToStep("GIT_PROVIDER");
                  }}
                  className="w-full p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-cyan-500/40 transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900/60 border border-white/[0.06] flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Git</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Connect a repo for automated CI/CD deployments (GitHub, GitLab)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 2. Database */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSourceType("DATABASE");
                    goToStep("DATABASE_SELECT");
                  }}
                  className="w-full p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-cyan-500/40 transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900/60 border border-white/[0.06] flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Database</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Prebuilt database instance (Postgres, MariaDB, MySQL, Redis, MongoDB)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 2: GIT PROVIDER (Screenshot 2)
          ======================================================= */}
          {step === "GIT_PROVIDER" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search all deployments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/80 outline-none"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                {/* GitLab */}
                <button
                  type="button"
                  onClick={handleSelectGitlabProvider}
                  className="w-full p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-orange-500/40 transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900/60 border border-white/[0.06] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <GitlabIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Gitlab</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Connect a GitLab repo for automated CI/CD deployments
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* GitHub */}
                <button
                  type="button"
                  onClick={handleSelectGithubProvider}
                  className="w-full p-3.5 rounded-xl border border-zinc-850/60 bg-zinc-900/30 hover:bg-zinc-900/80 hover:border-cyan-500/40 transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900/60 border border-white/[0.06] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <GithubIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Github</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Connect a repo for automated CI/CD deployments
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 2C: CONNECT GITLAB
          ======================================================= */}
          {step === "GITLAB_CONNECT" && (
            <div className="py-6 px-2 flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-950/40 border border-orange-800/40 flex items-center justify-center text-2xl shadow-xl overflow-hidden">
                {gitlabAuth?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gitlabAuth.avatar_url} alt={gitlabAuth.username} className="w-full h-full object-cover" />
                ) : (
                  <GitlabIcon className="w-7 h-7 text-orange-400" />
                )}
              </div>

              {gitlabAuth ? (
                <>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[11px] mb-2 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected to GitLab
                    </div>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      @{gitlabAuth.username}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      {gitlabAuth.name ? `${gitlabAuth.name} · ` : ""}Linked to your KotaCloud session
                    </p>
                  </div>

                  <div className="w-full space-y-2">
                    <button
                      type="button"
                      onClick={() => fetchGitlabRepos(gitlabAuth.token)}
                      disabled={isLoadingRepos}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-[0_0_20px_-3px_rgba(0,210,255,0.4)] border border-cyan-300/40 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoadingRepos ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          <span>Loading repositories...</span>
                        </>
                      ) : (
                        <span>View Repositories</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnectGitlab}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                    >
                      Disconnect / Switch Account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      Connect your GitLab Account
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      Authorize KotaCloud Spaces to access your GitLab repositories for automated builds and continuous deployment.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectGitlab}
                    disabled={isConnectingGitlab}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-[0_0_20px_-3px_rgba(0,210,255,0.4)] border border-cyan-300/40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isConnectingGitlab ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Connecting to GitLab...</span>
                      </>
                    ) : (
                      <>
                        <GitlabIcon className="w-4 h-4 text-black" />
                        <span>Authorize with GitLab</span>
                      </>
                    )}
                  </button>

                  <div className="w-full pt-1">
                    {!showPersonalTokenInput ? (
                      <button
                        type="button"
                        onClick={() => setShowPersonalTokenInput(true)}
                        className="text-[11px] text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer underline underline-offset-2"
                      >
                        Or connect with Personal Access Token
                      </button>
                    ) : (
                      <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-zinc-300 font-medium">
                            Personal Access Token
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPersonalTokenInput(false)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                            value={personalAccessToken}
                            onChange={(e) => setPersonalAccessToken(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500"
                          />
                          <button
                            type="button"
                            disabled={!personalAccessToken.trim() || isVerifyingToken}
                            onClick={handleVerifyAndSaveToken}
                            className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            {isVerifyingToken && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Connect</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Scope required: <code className="text-cyan-400">read_user</code>, <code className="text-cyan-400">read_repository</code>
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="w-full pt-4 border-t border-zinc-850 space-y-2 text-left">
                <label className="text-[11px] text-zinc-400">
                  Or enter Git Clone URL directly:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://gitlab.com/username/project.git"
                    value={gitlabUrl}
                    onChange={(e) => setGitlabUrl(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/80"
                  />
                  <button
                    type="button"
                    disabled={!gitlabUrl.trim()}
                    onClick={handleGitlabContinue}
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 2B: CONNECT GITHUB
          ======================================================= */}
          {step === "GITHUB_CONNECT" && (
            <div className="py-6 px-2 flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-xl">
                <GithubIcon className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  Connect your GitHub Account
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Authorize KotaCloud Spaces to access your repositories for automated builds and continuous deployment.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConnectGithub}
                disabled={isConnectingGithub}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-[0_0_20px_-3px_rgba(0,210,255,0.4)] border border-cyan-300/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isConnectingGithub ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Connecting to GitHub...</span>
                  </>
                ) : (
                  <>
                    <GithubIcon className="w-4 h-4 text-black" />
                    <span>Authorize with GitHub</span>
                  </>
                )}
              </button>

              <div className="w-full pt-4 border-t border-zinc-850 space-y-2 text-left">
                <label className="text-[11px] text-zinc-400">
                  Or enter Git Clone URL directly:
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="https://github.com/user/repo.git"
                      value={manualRepoUrl}
                      onChange={(e) => setManualRepoUrl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/80 font-mono"
                    />
                    <button
                      type="button"
                      disabled={!manualRepoUrl.trim()}
                      onClick={() => {
                        const rawName = manualRepoUrl.split("/").pop()?.replace(".git", "") || "my-service";
                        const uniqueName = generateUniqueServiceName(rawName);
                        let fullCloneUrl = manualRepoUrl.trim();
                        if (manualGitToken.trim() && !fullCloneUrl.includes("@")) {
                          if (fullCloneUrl.includes("github.com")) {
                            fullCloneUrl = fullCloneUrl.replace("https://github.com/", `https://x-access-token:${manualGitToken.trim()}@github.com/`);
                          } else if (fullCloneUrl.includes("gitlab.com")) {
                            fullCloneUrl = fullCloneUrl.replace("https://gitlab.com/", `https://oauth2:${manualGitToken.trim()}@gitlab.com/`);
                          } else {
                            fullCloneUrl = fullCloneUrl.replace("https://", `https://${manualGitToken.trim()}@`);
                          }
                        }
                        const repoItem: GitHubRepoItem = {
                          id: "manual",
                          name: uniqueName,
                          full_name: uniqueName,
                          private: Boolean(manualGitToken.trim()),
                          html_url: manualRepoUrl,
                          clone_url: fullCloneUrl,
                          default_branch: "main",
                        };
                        setIsManualRepo(true);
                        setSelectedRepo(repoItem);
                        setServiceName(uniqueName);
                        goToStep("GIT_BRANCH");
                        inspectRepository(repoItem, manualRepoUrl.includes("gitlab") ? "gitlab" : "github");
                      }}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      Next
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="Git Personal Access Token (optional, for private repos)"
                    value={manualGitToken}
                    onChange={(e) => setManualGitToken(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-cyan-500/80 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 3: GITHUB SELECT REPOSITORY (Screenshot 3)
          ======================================================= */}
          {step === "GITHUB_REPOS" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/80 outline-none"
                />
              </div>

              {/* Status koneksi — jelas berbeda antara full OAuth (token) dan public-only */}
              {step === "GITHUB_REPOS" && gitProvider === "github" && githubAuth && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${githubAuth.token ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-[11px] text-zinc-300 truncate">
                      {githubAuth.token ? "Connected" : "Public repositories only"}
                      {githubAuth.username ? ` — @${githubAuth.username}` : ""}
                      {!githubAuth.token && " — private repos require reconnecting with repo scope"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectGithub}
                    className="text-[11px] text-zinc-500 hover:text-rose-300 transition-colors shrink-0 cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {isLoadingRepos ? (
                <div className="p-8 flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <p className="text-xs">
                    {gitProvider === "gitlab" ? "Loading GitLab repositories..." : "Loading GitHub repositories..."}
                  </p>
                </div>
              ) : filteredRepos.length === 0 ? (
                githubRepos.length === 0 ? (
                  error ? (
                    <div className="p-6 text-center space-y-3">
                      <p className="text-xs text-rose-300">{error}</p>
                      <button
                        type="button"
                        onClick={() => fetchGithubRepos(githubAuth?.token, githubAuth?.username)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-700 text-[11px] text-zinc-300 hover:text-white hover:border-cyan-500/60 transition-colors cursor-pointer"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-zinc-500 space-y-2">
                      <p className="text-xs">
                        No repositories found{githubAuth?.username ? ` for @${githubAuth.username}` : ""}.
                      </p>
                      <p className="text-[11px]">
                        Create a repository on {gitProvider === "gitlab" ? "GitLab" : "GitHub"}, or verify your account has access to it.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="p-6 text-center text-zinc-500">
                    <p className="text-xs">No repositories match your search.</p>
                  </div>
                )
              ) : (
                <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => handleSelectRepo(repo)}
                      className="w-full p-2.5 rounded-xl border border-zinc-850/60 bg-zinc-900/30 hover:bg-zinc-900/80 hover:border-cyan-500/40 transition-all flex items-center justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {gitProvider === "gitlab" ? (
                          <GitlabIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        ) : (
                          <GitBranch className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 shrink-0" />
                        )}
                        <span className="font-medium text-xs text-zinc-200 group-hover:text-white truncate">
                          {repo.full_name}
                        </span>
                        {repo.private ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 shrink-0">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/50 text-cyan-400 border border-cyan-800/30 shrink-0">
                            Public
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =======================================================
              STEP 4: SELECT BRANCH & SERVICE NAME (Screenshot 4)
          ======================================================= */}
          {step === "GIT_BRANCH" && selectedRepo && (
            <div className="space-y-4">
              {/* Selected Repo Card */}
              <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-white truncate">
                      {selectedRepo.full_name}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {selectedRepo.private ? "Private repository" : "Public repository"}
                    </span>
                  </div>
                </div>
                {selectedRepo.private && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                    Private
                  </span>
                )}
              </div>

              {/* Service Name Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Service Name</label>
                  <span className="text-[10px] text-zinc-500 font-mono">Unique subdomain identifier</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. web-profile-4k8f"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500/80 outline-none font-mono"
                />
                <p className="text-[10px] text-zinc-500 font-mono">
                  Default subdomain: <span className="text-cyan-400">{serviceName || "service"}{PLATFORM_URL_SUFFIX}</span>
                </p>
              </div>

              {/* Git Access Token ONLY for Manual Repository URL (without OAuth) */}
              {isManualRepo && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">
                      Git Access Token <span className="text-zinc-500 font-normal">(optional if public)</span>
                    </label>
                    {selectedRepo.private && (
                      <span className="text-[10px] text-amber-400 font-mono">Private repository</span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="Personal Access Token (ghp_... or glpat-...)"
                    value={manualGitToken}
                    onChange={(e) => setManualGitToken(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500/80 outline-none font-mono"
                  />
                </div>
              )}

              {/* Application Preset (Matching Image 2) */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Application Preset</label>
                  {isDetectingRuntime && (
                    <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Detecting...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                    className="w-full bg-zinc-900/80 border border-zinc-800 hover:border-zinc-750 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 shadow-inner">
                        <LanguageLogo language={detectedLanguage || "Other"} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium truncate">{detectedLanguage || "Other"}</span>
                      {detectedPort && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          (port {detectedPort})
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-150 ${showPresetDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {/* Backdrop */}
                  {showPresetDropdown && (
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowPresetDropdown(false)}
                    />
                  )}

                  {/* Preset Dropdown list */}
                  {showPresetDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 space-y-1 max-h-56 overflow-y-auto">
                      {APPLICATION_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPreset(p)}
                          className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            (detectedLanguage || "Other").toLowerCase() === p.language.toLowerCase()
                              ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-semibold"
                              : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded bg-zinc-800/80 flex items-center justify-center">
                              <LanguageLogo language={p.language} className="w-3.5 h-3.5" />
                            </div>
                            <span>{p.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">port {p.port}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Container Port */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Container Port</label>
                  <span className="text-[10px] text-zinc-500 font-mono">Port aplikasi di dalam container</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={containerPort}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    const n = parseInt(v, 10);
                    setContainerPort(v === "" ? "" : String(Math.min(n > 65535 ? 65535 : n, 65535)));
                  }}
                  placeholder="8080"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none font-mono focus:border-cyan-500/80"
                />
                <p className="text-[10px] text-zinc-500 font-mono">
                  Bisa diubah kapan saja dari halaman service tanpa deploy ulang.
                </p>
              </div>

              {/* Custom Domain (optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">
                    Custom Domain <span className="text-zinc-500 font-normal">(optional)</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">mis. api.contoh.com</span>
                </div>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ""))}
                  placeholder="app.contoh.com"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none font-mono focus:border-cyan-500/80"
                />
                <p className="text-[10px] text-zinc-500 font-mono">
                  Kosongkan untuk memakai subdomain platform ({(serviceName || "service") + PLATFORM_URL_SUFFIX}).
                  Domain custom diverifikasi otomatis begitu DNS diarahkan.
                </p>
              </div>

              {/* Root Directory (Matching Image 2 & Modal in Image 4) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Root Directory</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={rootDir}
                      readOnly
                      onClick={openRootDirModal}
                      placeholder="./"
                      className="w-full bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/80 cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={openRootDirModal}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Environment Variables (Matching Image 2 & Image 3) */}
              {!showEnvVars ? (
                <button
                  type="button"
                  onClick={() => setShowEnvVars(true)}
                  className="w-full p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 flex items-center justify-between text-xs font-medium text-zinc-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                    <span>Environment Variables</span>
                  </div>
                  {envVars.filter((e) => e.key.trim() !== "").length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                      {envVars.filter((e) => e.key.trim() !== "").length} variable{envVars.filter((e) => e.key.trim() !== "").length > 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/70 space-y-3.5">
                  <button
                    type="button"
                    onClick={() => setShowEnvVars(false)}
                    className="flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                    <span>Environment Variables</span>
                  </button>

                  {/* Variables list */}
                  <div className="space-y-3 pt-1">
                    {envVars.map((item) => (
                      <div key={item.id} className="space-y-2 p-3 rounded-lg bg-zinc-900/40 border border-zinc-850/80">
                        {/* Key */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-zinc-400">Key</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="EXAMPLE_NAME"
                              value={item.key}
                              onChange={(e) => updateEnvVar(item.id, "key", e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/80"
                            />
                            {envVars.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEnvVar(item.id)}
                                className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer shrink-0"
                                title="Remove variable"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Value */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-zinc-400">Value</label>
                          <div className="relative">
                            <input
                              type={item.showValue ? "text" : "password"}
                              placeholder="value"
                              value={item.value}
                              onChange={(e) => updateEnvVar(item.id, "value", e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/80"
                            />
                            <button
                              type="button"
                              onClick={() => toggleShowValue(item.id)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                            >
                              {item.showValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Environments */}
                        <div className="space-y-1 relative">
                          <label className="text-[11px] font-medium text-zinc-400">Environments</label>
                          <button
                            type="button"
                            onClick={() => setOpenEnvDropdownId(openEnvDropdownId === item.id ? null : item.id)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs text-zinc-200 transition-colors cursor-pointer"
                          >
                            <span className="truncate">{item.environment || "Production and Preview"}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 shrink-0 ml-2 ${
                                openEnvDropdownId === item.id ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {/* Backdrop */}
                          {openEnvDropdownId === item.id && (
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setOpenEnvDropdownId(null)}
                            />
                          )}

                          {/* Dropdown Options (Matching Vercel Screenshot) */}
                          {openEnvDropdownId === item.id && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#121214] border border-zinc-800 rounded-lg shadow-2xl py-1 backdrop-blur-md">
                              {ENVIRONMENT_OPTIONS.map((opt) => {
                                const isSelected = (item.environment || "Production and Preview") === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      updateEnvVar(item.id, "environment", opt);
                                      setOpenEnvDropdownId(null);
                                    }}
                                    className={`w-full px-3 py-2 flex items-center gap-2 text-xs text-left transition-colors cursor-pointer ${
                                      isSelected
                                        ? "bg-zinc-800/60 text-white font-medium"
                                        : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                                    }`}
                                  >
                                    <span className="w-4 flex items-center justify-center shrink-0">
                                      {isSelected ? (
                                        <Check className="w-3.5 h-3.5 text-white" />
                                      ) : null}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions Bar (Image 3) */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowImportEnvModal(!showImportEnvModal)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer"
                      >
                        Import .env
                      </button>
                      <span className="text-[11px] text-zinc-500">or paste the .env contents</span>
                    </div>

                    <button
                      type="button"
                      onClick={addEnvVar}
                      className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Add More</span>
                    </button>
                  </div>

                  {/* Paste .env box */}
                  {showImportEnvModal && (
                    <div className="p-3 rounded-xl border border-cyan-500/30 bg-zinc-900/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Paste .env contents</span>
                        <button
                          type="button"
                          onClick={() => setShowImportEnvModal(false)}
                          className="text-zinc-500 hover:text-white text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={pasteEnvText}
                        onChange={(e) => setPasteEnvText(e.target.value)}
                        placeholder={`KEY=value\nDATABASE_URL=postgres://...\nNODE_ENV=production`}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-cyan-300 placeholder:text-zinc-600 outline-none focus:border-cyan-500/80"
                      />
                      <button
                        type="button"
                        onClick={handleApplyImportEnv}
                        disabled={!pasteEnvText.trim()}
                        className="w-full py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Apply Variables
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Branch Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Deploy branch</label>
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
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={isLoadingBranches}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:border-cyan-500/80 outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {availableBranches.map((b) => (
                      <option key={b} value={b} className="bg-zinc-900 text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deploy Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-[0_0_20px_-3px_rgba(0,210,255,0.4)] hover:shadow-[0_0_25px_rgba(0,210,255,0.6)] border border-cyan-300/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Deploying Service...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-black fill-current" />
                      <span>Deploy Service</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 2-DB: DATABASE SELECTION
          ======================================================= */}
          {step === "DATABASE_SELECT" && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Pilih jenis database yang ingin Anda deploy dalam project ini:
              </p>

              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {DATABASE_PRESETS.map((db) => {
                  const isSelected = selectedDb?.id === db.id;
                  return (
                    <button
                      key={db.id}
                      type="button"
                      onClick={() => handleSelectDatabasePreset(db)}
                      className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between text-left group cursor-pointer ${
                        isSelected
                          ? "bg-cyan-950/20 border-cyan-400/60 shadow-[0_0_15px_-3px_rgba(0,210,255,0.2)]"
                          : "bg-zinc-900/30 border-zinc-800/60 hover:bg-zinc-900/70 hover:border-zinc-700/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-xs bg-zinc-900/60 border-white/[0.06]">
                          <LanguageLogo language={db.id} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white text-xs">{db.name}</h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                              v{db.version}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{db.desc}</p>
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDb && (
                <div className="space-y-3 pt-2 border-t border-zinc-850 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300">
                      Service Name
                    </label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="e.g. postgres-db"
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/80 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-[0_0_20px_-3px_rgba(0,210,255,0.4)] hover:shadow-[0_0_25px_rgba(0,210,255,0.6)] border border-cyan-300/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Deploying {selectedDb.name}...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-black fill-current" />
                        <span>Deploy {selectedDb.name} Database</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {/* =======================================================
            ROOT DIRECTORY MODAL POPUP (Matching Screenshot 4)
        ======================================================= */}
        {isEditingRootDir && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-[420px] rounded-2xl border border-zinc-800 bg-[#0c0d12] p-5 shadow-2xl space-y-4">
              {/* Header */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Root Directory</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Select the directory containing your source code. For monorepos, create a separate project for each directory you want to deploy.
                </p>
              </div>

              {/* Repo Name */}
              <div className="flex items-center gap-2 text-xs font-semibold text-white pt-1">
                <GithubIcon className="w-4 h-4 text-zinc-300 shrink-0" />
                <span className="truncate">{selectedRepo?.name}</span>
              </div>

              {/* Directory Tree Box */}
              <div className="border border-zinc-800/90 rounded-xl bg-zinc-950/70 overflow-hidden divide-y divide-zinc-850/60 max-h-[220px] overflow-y-auto">
                {/* Root Option */}
                <button
                  type="button"
                  onClick={() => setSelectedDirectoryPath("./")}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                    selectedDirectoryPath === "./" || selectedDirectoryPath === ""
                      ? "bg-zinc-900/90 text-white font-medium"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedDirectoryPath === "./" || selectedDirectoryPath === ""
                          ? "border-cyan-400 bg-cyan-400"
                          : "border-zinc-600"
                      }`}
                    >
                      {(selectedDirectoryPath === "./" || selectedDirectoryPath === "") && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      )}
                    </div>
                    <span className="truncate">
                      {selectedRepo?.name}{" "}
                      <span className="text-zinc-500 font-normal">(root)</span>
                    </span>
                  </div>
                </button>

                {/* Loading indicator */}
                {isLoadingDirectories && (
                  <div className="px-3.5 py-4 flex items-center justify-center gap-2 text-xs text-zinc-400 font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Loading directories...</span>
                  </div>
                )}

                {/* Subdirectories */}
                {!isLoadingDirectories &&
                  availableDirectories.map((dir) => (
                    <button
                      key={dir.path}
                      type="button"
                      onClick={() => setSelectedDirectoryPath(dir.path)}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                        selectedDirectoryPath === dir.path
                          ? "bg-zinc-900/90 text-white font-medium"
                          : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                      }`}
                    >
                      <div
                        className="flex items-center gap-2 min-w-0"
                        style={{ paddingLeft: `${dir.depth * 14}px` }}
                      >
                        <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedDirectoryPath === dir.path
                              ? "border-cyan-400 bg-cyan-400"
                              : "border-zinc-600"
                          }`}
                        >
                          {selectedDirectoryPath === dir.path && (
                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
                          )}
                        </div>
                        <span className="truncate">{dir.name}</span>
                      </div>
                    </button>
                  ))}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setIsEditingRootDir(false)}
                  className="px-4 py-2 rounded-xl bg-transparent border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRootDir(selectedDirectoryPath || "./");
                    setIsEditingRootDir(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
