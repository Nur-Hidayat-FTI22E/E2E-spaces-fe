"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Service } from "@/types/service";
import { LanguageLogo } from "@/components/ui/language-logo";
import { Database } from "lucide-react";

interface ServiceIconProps {
  service: Service;
  className?: string;
}

/**
 * ServiceIcon:
 * 1. If service is a database, renders the official logo of the database (Postgres, MySQL, MongoDB, Redis).
 * 2. If service is an application, attempts to load the app's favicon.ico (from deployed domain or GitHub repository).
 * 3. If no favicon is available or loading fails, falls back to the programming language/framework logo.
 */
export function ServiceIcon({ service, className = "w-5 h-5" }: ServiceIconProps) {
  // 1. Detect Database Type
  const dbType = useMemo(() => {
    const lower = `${service.name} ${service.slug} ${service.docker_image || ""} ${service.description || ""}`.toLowerCase();

    if (service.type === "DATABASE") {
      if (lower.includes("postgres") || lower.includes("pgsql") || service.container_port === 5432) return "postgres";
      if (lower.includes("mysql") || lower.includes("mariadb") || service.container_port === 3306) return "mysql";
      if (lower.includes("mongo") || service.container_port === 27017) return "mongodb";
      if (lower.includes("redis") || service.container_port === 6379) return "redis";
      return "postgres";
    }

    if (lower.includes("postgres") || lower.includes("pgsql")) return "postgres";
    if (lower.includes("mysql") || lower.includes("mariadb")) return "mysql";
    if (lower.includes("mongo")) return "mongodb";
    if (lower.includes("redis")) return "redis";

    return null;
  }, [service]);

  // 2. Candidate Favicon URLs for Deployed Applications
  const faviconCandidates = useMemo(() => {
    if (dbType) return [];

    const list: string[] = [];

    // Live deployed subdomain URL
    if (service.subdomain) {
      const domain = service.subdomain.includes(".")
        ? service.subdomain
        : `${service.subdomain}-spaces.kotacloud.com`;
      list.push(`https://${domain}/favicon.ico`);
      list.push(`https://${domain}/favicon.png`);
      list.push(`https://${domain}/favicon.svg`);
    }

    // GitHub repository raw URLs
    if (service.repository_url) {
      const cleaned = service.repository_url.replace(/\.git$/, "");
      const match =
        cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/) ||
        cleaned.match(/^([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)$/);

      if (match) {
        const owner = match[1];
        const repo = match[2];
        const branch = service.branch || "main";

        // Candidate paths in repository
        list.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/public/favicon.ico`);
        list.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/app/favicon.ico`);
        list.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/src/app/favicon.ico`);
        list.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/favicon.ico`);
        list.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/public/favicon.png`);
        list.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/public/favicon.svg`);

        if (branch === "main") {
          list.push(`https://raw.githubusercontent.com/${owner}/${repo}/master/public/favicon.ico`);
          list.push(`https://raw.githubusercontent.com/${owner}/${repo}/master/app/favicon.ico`);
          list.push(`https://raw.githubusercontent.com/${owner}/${repo}/master/favicon.ico`);
        }
      }
    }

    return Array.from(new Set(list));
  }, [dbType, service.subdomain, service.repository_url, service.branch]);

  // Favicon loading state
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [faviconLoaded, setFaviconLoaded] = useState(false);
  const [allFaviconsFailed, setAllFaviconsFailed] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setFaviconLoaded(false);
    setAllFaviconsFailed(false);
  }, [service.id, faviconCandidates.length]);

  const handleFaviconError = () => {
    if (candidateIndex + 1 < faviconCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setAllFaviconsFailed(true);
    }
  };

  // 3. Detect Programming Language for App Fallback
  const detectedLanguage = useMemo(() => {
    const name = service.name.toLowerCase();
    const slug = (service.slug || "").toLowerCase();
    const desc = (service.description || "").toLowerCase();
    const img = (service.docker_image || "").toLowerCase();
    const repo = (service.repository_url || "").toLowerCase();
    const envKeys = service.env_vars ? Object.keys(service.env_vars).join(" ").toLowerCase() : "";
    const combined = `${name} ${slug} ${desc} ${img} ${repo} ${envKeys}`;

    if (combined.includes("next") || combined.includes("nextjs")) return "next";
    if (combined.includes("react") || combined.includes("vite")) return "react";
    if (combined.includes("typescript")) return "typescript";
    if (
      combined.includes("nodejs") ||
      combined.includes("node:") ||
      combined.includes("node-") ||
      combined.includes("expressjs") ||
      combined.includes("nestjs") ||
      combined.includes("javascript") ||
      name === "node" || slug === "node"
    ) {
      if (service.type === "FRONTEND") return "next";
      return "node";
    }
    if (
      combined.includes("python") ||
      combined.includes("django") ||
      combined.includes("flask") ||
      combined.includes("fastapi") ||
      combined.includes("uvicorn") ||
      combined.includes("gunicorn") ||
      service.container_port === 8000 ||
      service.container_port === 5000
    ) {
      return "python";
    }
    // Go: only match exact "golang" or "golang:" docker image prefix, NOT "go" substring
    if (
      combined.includes("golang") ||
      img.startsWith("golang") ||
      name === "go" || slug === "go"
    ) {
      return "go";
    }
    if (combined.includes("rust") || combined.includes("cargo")) return "rust";
    if (combined.includes("php") || combined.includes("laravel")) return "php";
    if (combined.includes("html") || service.container_port === 80 || service.container_port === 443) return "html";
    if (combined.includes("java") || combined.includes("spring") || combined.includes("openjdk")) return "java";
    if (combined.includes("docker")) return "docker";
    if (service.container_port === 8080) return "go"; // common Go port as last resort

    if (service.type === "FRONTEND") return "next";
    if (service.type === "WORKER") return "node";
    return "node";
  }, [service]);

  // A. If Database, render Database Logo directly
  if (dbType) {
    return <LanguageLogo language={dbType} className={className} />;
  }

  // B. If Application, try Favicon first, fallback to LanguageLogo
  const showFavicon = !allFaviconsFailed && faviconCandidates.length > 0;

  return (
    <div className="relative flex items-center justify-center shrink-0">
      {/* Fallback Programming Language Icon (shown while favicon loads or if all favicons fail) */}
      {(!faviconLoaded || allFaviconsFailed) && (
        <LanguageLogo language={detectedLanguage} className={className} />
      )}

      {/* Deployed App Favicon */}
      {showFavicon && (
        <img
          key={faviconCandidates[candidateIndex]}
          src={faviconCandidates[candidateIndex]}
          alt={service.name}
          className={`${className} object-contain rounded-sm transition-opacity duration-200 ${
            faviconLoaded ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          }`}
          onLoad={() => setFaviconLoaded(true)}
          onError={handleFaviconError}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      )}
    </div>
  );
}

/**
 * Helper to get matching container background, border, and glow for each service type/database
 */
export function getServiceBrandStyle(service: Service) {
  const lower = `${service.name} ${service.slug} ${service.docker_image || ""} ${service.description || ""}`.toLowerCase();

  if (lower.includes("postgres") || lower.includes("pgsql") || (service.type === "DATABASE" && service.container_port === 5432)) {
    return {
      boxStyle: "bg-sky-950/40 border-sky-800/50 text-sky-400 group-hover:border-sky-600/70 shadow-[0_0_12px_rgba(51,103,145,0.25)]",
      badge: "PostgreSQL",
    };
  }

  if (lower.includes("mysql") || lower.includes("mariadb") || (service.type === "DATABASE" && service.container_port === 3306)) {
    return {
      boxStyle: "bg-cyan-950/40 border-cyan-800/50 text-cyan-400 group-hover:border-cyan-600/70 shadow-[0_0_12px_rgba(0,117,143,0.25)]",
      badge: "MySQL",
    };
  }

  if (lower.includes("mongo") || (service.type === "DATABASE" && service.container_port === 27017)) {
    return {
      boxStyle: "bg-emerald-950/40 border-emerald-800/50 text-emerald-400 group-hover:border-emerald-600/70 shadow-[0_0_12px_rgba(0,237,100,0.25)]",
      badge: "MongoDB",
    };
  }

  if (lower.includes("redis") || (service.type === "DATABASE" && service.container_port === 6379)) {
    return {
      boxStyle: "bg-rose-950/40 border-rose-800/50 text-rose-400 group-hover:border-rose-600/70 shadow-[0_0_12px_rgba(220,56,45,0.25)]",
      badge: "Redis",
    };
  }

  // Application / Web
  return {
    boxStyle: "bg-zinc-900 border-zinc-800 text-zinc-300 group-hover:border-zinc-700 shadow-inner",
    badge: service.type,
  };
}
