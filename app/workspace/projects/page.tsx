"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProjectsListSkeleton } from "@/components/ui/skeleton";
import { listProjectsApi, deleteProjectApi } from "@/lib/api/projects";
import { Project } from "@/types/project";
import {
  FolderGit2,
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion modal state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      try {
        const data = await listProjectsApi();
        if (isMounted) setProjects(data.projects || []);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load projects";
          setError(msg);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listProjectsApi();
      setProjects(data.projects || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load projects";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProjectApi(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete project";
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show skeleton on initial load
  if (isLoading) {
    return (
      <DashboardShell title="Projects" showCreateButton={true}>
        <ProjectsListSkeleton />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Projects" showCreateButton={true}>
      <div className="flex flex-col gap-6">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Projects
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Deploy, configure, and monitor your cloud applications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/40 border border-white/[0.06] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 transition-all font-mono"
              />
            </div>

            <Link href="/workspace/projects/new">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs font-semibold whitespace-nowrap"
              >
                Create Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-6 rounded-xl border border-rose-900/40 bg-rose-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
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

        {/* Empty State */}
        {!isLoading && !error && projects.length === 0 && (
          <div className="p-16 rounded-xl border border-white/[0.06] bg-[#0c0d10] text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-center text-zinc-500">
              <FolderGit2 className="w-6 h-6 text-zinc-400" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-base font-semibold text-white">No projects yet.</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deploy your first application to KotaCloud Spaces using Git, a Docker image, or local source upload.
              </p>
            </div>
            <Link href="/workspace/projects/new">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4 text-black" />}
                className="font-semibold text-xs mt-2"
              >
                Create Project
              </Button>
            </Link>
          </div>
        )}

        {/* No Search Matches */}
        {!isLoading && !error && projects.length > 0 && filteredProjects.length === 0 && (
          <div className="p-12 rounded-xl border border-white/[0.06] bg-[#0c0d10] text-center">
            <p className="text-xs text-zinc-400 font-mono">
              No projects match &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}

        {/* Project Cards Grid */}
        {!isLoading && !error && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={(p) => setProjectToDelete(p)}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDialog
          isOpen={!!projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete project "${projectToDelete?.name}"?`}
          description="Are you sure? This action permanently removes the project and all associated deployments, container volumes, and custom domains. This cannot be undone."
          confirmText="Delete Project"
          variant="danger"
          isLoading={isDeleting}
          verificationKeyword={projectToDelete?.name}
        />
      </div>
    </DashboardShell>
  );
}
