import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/protected-route";

export const metadata: Metadata = {
  title: "Workspace — KotaCloud Spaces",
  description: "KotaCloud Spaces developer workspace and container runtime console.",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="h-screen h-[100dvh] overflow-hidden bg-[#030304] flex flex-col">{children}</div>
    </ProtectedRoute>
  );
}
