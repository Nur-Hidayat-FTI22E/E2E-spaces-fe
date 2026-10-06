"use client";

import React from "react";
import { DeploymentStatus } from "@/types/deployment";
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface DeploymentTimelineProps {
  status: DeploymentStatus;
  createdAt: string;
  updatedAt?: string;
}

interface Step {
  id: string;
  label: string;
  description: string;
  state: "completed" | "current" | "pending" | "failed";
}

export function DeploymentTimeline({
  status,
  createdAt,
  updatedAt,
}: DeploymentTimelineProps) {
  const isFailed = status === "FAILED";
  const isStopped = status === "STOPPED";
  const isRemoved = status === "REMOVED";

  // Determine stage progression
  const getSteps = (): Step[] => {
    const steps: Step[] = [
      {
        id: "created",
        label: "Deployment Created",
        description: `Triggered ${new Date(createdAt).toLocaleTimeString()}`,
        state: "completed",
      },
      {
        id: "queued",
        label: "Queued",
        description: "Enqueued in execution plane",
        state:
          status === "QUEUED"
            ? "current"
            : ["BUILDING", "DEPLOYING", "RUNNING", "STOPPED", "FAILED", "REMOVED"].includes(status)
            ? "completed"
            : "pending",
      },
      {
        id: "building",
        label: "Building",
        description: isFailed
          ? "Build or compilation failed"
          : status === "BUILDING"
          ? "Compiling code & building container"
          : ["DEPLOYING", "RUNNING", "STOPPED", "REMOVED"].includes(status)
          ? "Container image built"
          : "pending",
        state:
          isFailed && status === "FAILED"
            ? "failed"
            : status === "BUILDING"
            ? "current"
            : ["DEPLOYING", "RUNNING", "STOPPED", "REMOVED"].includes(status)
            ? "completed"
            : "pending",
      },
      {
        id: "deploying",
        label: "Deploying",
        description:
          status === "DEPLOYING"
            ? "Starting runtime container"
            : ["RUNNING", "STOPPED", "REMOVED"].includes(status)
            ? "Container launched & port bound"
            : isFailed
            ? "Aborted due to failure"
            : "pending",
        state:
          isFailed
            ? "pending"
            : status === "DEPLOYING"
            ? "current"
            : ["RUNNING", "STOPPED", "REMOVED"].includes(status)
            ? "completed"
            : "pending",
      },
      {
        id: "running",
        label: isStopped ? "Stopped" : isRemoved ? "Removed" : "Running",
        description:
          status === "RUNNING"
            ? "Healthy and serving requests"
            : isStopped
            ? "Container paused"
            : isRemoved
            ? "Resources cleaned up"
            : isFailed
            ? "Deployment failed"
            : "pending",
        state:
          status === "RUNNING"
            ? "completed"
            : isStopped || isRemoved
            ? "current"
            : isFailed
            ? "failed"
            : "pending",
      },
    ];

    return steps;
  };

  const steps = getSteps();

  return (
    <div className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-850">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Deployment Timeline
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time pipeline progression from Control Plane to Execution Plane
          </p>
        </div>

        {updatedAt && (
          <span className="text-[11px] font-mono text-zinc-500">
            Last transition: {new Date(updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
        {steps.map((step, index) => {
          return (
            <div
              key={step.id}
              className={`flex flex-col p-3 rounded-lg border transition-all ${
                step.state === "completed"
                  ? "bg-zinc-900/40 border-zinc-800"
                  : step.state === "current"
                  ? "bg-cyan-950/20 border-cyan-500/60 shadow-[0_0_15px_-3px_rgba(0,210,255,0.2)]"
                  : step.state === "failed"
                  ? "bg-rose-950/30 border-rose-600/70"
                  : "bg-zinc-950/30 border-zinc-850/60 opacity-60"
              }`}
            >
              {/* Step indicator top */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-zinc-500">
                  0{index + 1}
                </span>

                {step.state === "completed" && (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                )}
                {step.state === "current" && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                )}
                {step.state === "failed" && (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                {step.state === "pending" && (
                  <Clock className="w-4 h-4 text-zinc-600" />
                )}
              </div>

              {/* Title & Desc */}
              <span
                className={`text-xs font-semibold ${
                  step.state === "completed"
                    ? "text-zinc-200"
                    : step.state === "current"
                    ? "text-cyan-300 font-bold"
                    : step.state === "failed"
                    ? "text-rose-300"
                    : "text-zinc-500"
                }`}
              >
                {step.label}
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed font-mono">
                {step.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
