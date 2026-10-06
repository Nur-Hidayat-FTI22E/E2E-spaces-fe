"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { createProjectApi } from "@/lib/api/projects";
import { useToast } from "@/lib/toast/toast-context";
import {
  FolderPlus,
  ArrowRight,
  ArrowLeft,
  Boxes,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const queryName = searchParams.get("name") || "";
  const [name, setName] = useState(queryName);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatedSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a project name");
      return;
    }

    setIsSubmitting(true);
    try {
      const project = await createProjectApi({
        name: trimmedName,
        description: description.trim() || undefined,
      });

      toast.success("Project Initialized", {
        message: `Project "${project.name}" created successfully. You can now add services.`,
      });

      router.push(`/workspace/projects/${project.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create project";
      setError(msg);
      if (msg.includes("PLAN_LIMIT_REACHED")) {
        toast.error("Project Limit Reached", {
          message: "Your current plan has reached its project workspace quota. Upgrade to create additional projects.",
        });
      } else {
        toast.error("Creation Failed", { message: msg.replace(/^Failed to create project:\s*/i, "") });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/workspace/projects"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-cyan-400 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Projects</span>
        </Link>
      </div>

      {/* Page Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
          <FolderPlus className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Create New Project</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            An isolated workspace to deploy, connect, and scale your services.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="relative rounded-2xl border border-zinc-800/90 bg-zinc-950/70 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Top cyan laser glow */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        <form onSubmit={handleSubmit}>
          {/* Card Header Section (Vertical Layout) */}
          <div className="p-6 pb-5 border-b border-zinc-850/80">
            <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
              <Boxes className="w-4 h-4 text-cyan-400" />
              <span>Project Configuration</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Give your project an identifiable name. Once created, you can deploy backend APIs, frontend apps, and databases inside it.
            </p>
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-5">
            {error && (
              error.includes("PLAN_LIMIT_REACHED") ? (
                <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-zinc-950 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>Project Limit Reached</span>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
                          Upgrade Required
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed max-w-md">
                        Your current plan has reached its project workspace limit. Upgrade to <strong>Developer</strong> or <strong>Professional</strong> to create more projects.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:self-center shrink-0 pt-1 sm:pt-0">
                    <Link
                      href="/workspace/upgrade?plan=developer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] shrink-0 text-center cursor-pointer"
                    >
                      <span>Upgrade Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 text-xs bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="leading-snug">{error.replace(/^Failed to create project:\s*/i, "")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="p-1 rounded text-rose-400/70 hover:text-rose-200 hover:bg-rose-900/40 transition-colors shrink-0"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            )}

            {/* Field 1: Project Name */}
            <div className="space-y-1.5">
              <label htmlFor="project-name" className="block text-xs font-medium text-zinc-300">
                Project Name <span className="text-cyan-400">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                placeholder="e.g. My Startup Platform, E-Commerce Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all outline-none"
              />

              {/* Slug Preview */}
              <div className="flex items-center gap-2 pt-1 text-xs font-mono text-zinc-500">
                <span>Slug:</span>
                <span className="text-zinc-400 font-bold">
                  {generatedSlug || "project-slug"}
                </span>
                <span className="text-zinc-600 text-[11px]">(used for internal routing & DNS)</span>
              </div>
            </div>

            {/* Field 2: Description */}
            <div className="space-y-1.5">
              <label htmlFor="project-desc" className="block text-xs font-medium text-zinc-300">
                Description <span className="text-zinc-500 text-[11px]">(Optional)</span>
              </label>
              <input
                id="project-desc"
                type="text"
                placeholder="Brief description of this project workspace"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all outline-none"
              />
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="p-5 border-t border-zinc-850/80 bg-zinc-900/30 flex items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
              <span>Configure env vars & domains after creation.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Link
                href="/workspace/projects"
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors text-center"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-[0_0_20px_-3px_rgba(0,210,255,0.4)] hover:shadow-[0_0_25px_-2px_rgba(0,210,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Creating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create & Open Project</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <DashboardShell
      title="Create Project"
      subtitle="Initialize a new project environment for your services"
      showCreateButton={false}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        }
      >
        <NewProjectContent />
      </Suspense>
    </DashboardShell>
  );
}

