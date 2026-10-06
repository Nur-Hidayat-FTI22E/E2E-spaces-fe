"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { X } from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showCreateButton?: boolean;
  hideSidebar?: boolean;
  fullHeight?: boolean;
  noTopPadding?: boolean;
}

export function DashboardShell({
  children,
  title = "Projects",
  subtitle,
  showCreateButton = true,
  hideSidebar,
  fullHeight = false,
  noTopPadding = false,
}: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Hide sidebar when explicitly requested or when inside a specific service page (/workspace/projects/[projectId]/services/[serviceId]...)
  const isInsideService =
    hideSidebar ?? (pathname ? /\/workspace\/projects\/[^/]+\/services(\/|$)/.test(pathname) : false);

  return (
    <div className="h-screen h-[100dvh] overflow-hidden flex bg-[#030304] text-zinc-100 font-sans w-full">
      {/* Desktop Sidebar (Shown everywhere EXCEPT inside service pages) */}
      {!isInsideService && (
        <div className="hidden md:block shrink-0 h-full overflow-hidden">
          <Sidebar />
        </div>
      )}

      {/* Mobile Drawer (Only when sidebar is active) */}
      {!isInsideService && mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-[80%] bg-[#060608] z-10">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar
          title={title}
          subtitle={subtitle}
          showCreateButton={showCreateButton}
          showLogo={isInsideService}
          onMobileMenuToggle={!isInsideService ? () => setMobileSidebarOpen(!mobileSidebarOpen) : undefined}
        />
        <main
          className={`flex-1 min-h-0 w-full mx-auto ${
            fullHeight
              ? "flex flex-col overflow-hidden max-w-7xl px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6"
              : noTopPadding
              ? "overflow-y-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 pt-0"
              : "overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
