"use client";

import React from "react";
import Link from "next/link";
import { Bell, Plus, Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onMobileMenuToggle?: () => void;
  showCreateButton?: boolean;
  showLogo?: boolean;
}

export function Topbar({
  title = "Projects",
  subtitle,
  onMobileMenuToggle,
  showCreateButton = true,
  showLogo = false,
}: TopbarProps) {

  return (
    <header className="h-14 border-b border-white/[0.06] bg-[#060608]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Logo (when in project) & Page Title / Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {showLogo && (
          <div className="flex items-center gap-3 pr-3 border-r border-white/[0.06] shrink-0">
            <Logo size="sm" href="/workspace/projects" />
          </div>
        )}

        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800"
            aria-label="Open navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 text-xs truncate">
          {showLogo ? (
            <>
              <Link
                href="/workspace/projects"
                className="text-zinc-400 hover:text-white font-medium transition-colors shrink-0"
              >
                Projects
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <span className="font-semibold text-zinc-100 truncate">{title}</span>
              {subtitle && (
                <>
                  <span className="text-zinc-700 hidden sm:inline">•</span>
                  <span className="text-zinc-400 font-mono hidden sm:inline truncate">{subtitle}</span>
                </>
              )}
            </>
          ) : (
            <>
              <h1 className="text-sm font-semibold text-zinc-100 tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <>
                  <span className="text-zinc-600">/</span>
                  <span className="text-xs text-zinc-400 font-mono truncate">{subtitle}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Notification and Actions */}
      <div className="flex items-center gap-3">

        {/* Notifications Icon */}
        <button
          className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-900 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute top-1.5 right-1.5" />
        </button>

        {/* Quick New Project CTA */}
        {showCreateButton && (
          <Link href="/workspace/projects/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs font-semibold px-3"
            >
              New Project
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
