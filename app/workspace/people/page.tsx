"use client";

import React from "react";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, ShieldCheck, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function PeoplePage() {
  const { user } = useAuth();
  const userName = user?.name || (user?.email ? user.email.split("@")[0] : "Syahrul Ramadhan");
  const userEmail = user?.email || "developer@kotacloud.com";

  return (
    <DashboardShell
      title="People"
      subtitle="Manage team members, roles, and collaboration permissions for this workspace."
      showCreateButton={false}
    >
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Workspace Members</h2>
            <p className="text-xs text-zinc-500">1 member in this workspace</p>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium h-8 px-3 gap-1.5 shadow-sm">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Member</span>
          </Button>
        </div>

        <Card className="bg-zinc-900/30 border-white/[0.06] overflow-hidden">
          <div className="divide-y divide-white/[0.06]">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-xs font-semibold text-cyan-300 font-mono">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{userName}</span>
                    <span className="text-[10px] bg-cyan-950/50 text-cyan-300 border border-cyan-800/30 px-1.5 py-0.5 rounded font-mono">
                      YOU
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">{userEmail}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-800/60 px-2.5 py-1 rounded-md border border-white/[0.06]">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Workspace Owner</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
