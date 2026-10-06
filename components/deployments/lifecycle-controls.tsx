"use client";

import React, { useState } from "react";
import { DeploymentStatus } from "@/types/deployment";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  startDeploymentApi,
  stopDeploymentApi,
  restartDeploymentApi,
  removeDeploymentApi,
} from "@/lib/api/deployments";
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
} from "lucide-react";

interface LifecycleControlsProps {
  deploymentId: string;
  status: DeploymentStatus;
  onActionComplete?: () => void;
  onRemoveComplete?: () => void;
  compact?: boolean;
  className?: string;
}

export function LifecycleControls({
  deploymentId,
  status,
  onActionComplete,
  onRemoveComplete,
  compact = false,
  className = "",
}: LifecycleControlsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);

  const canStart = status === "STOPPED" || status === "FAILED";
  const canStop = status === "RUNNING" || status === "BUILDING" || status === "DEPLOYING";
  const canRestart = status === "RUNNING" || status === "STOPPED" || status === "FAILED";

  const handleStart = async () => {
    setActionLoading("start");
    try {
      await startDeploymentApi(deploymentId);
      onActionComplete?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start deployment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading("stop");
    try {
      await stopDeploymentApi(deploymentId);
      setShowStopDialog(false);
      onActionComplete?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to stop deployment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async () => {
    setActionLoading("restart");
    try {
      await restartDeploymentApi(deploymentId);
      setShowRestartDialog(false);
      onActionComplete?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to restart deployment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async () => {
    setActionLoading("remove");
    try {
      await removeDeploymentApi(deploymentId);
      setShowRemoveDialog(false);
      if (onRemoveComplete) {
        onRemoveComplete();
      } else {
        onActionComplete?.();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove deployment");
    } finally {
      setActionLoading(null);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {canStart && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStart}
            isLoading={actionLoading === "start"}
            className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30"
            title="Start Container"
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
        )}

        {canStop && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStopDialog(true)}
            isLoading={actionLoading === "stop"}
            className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
            title="Stop Container"
          >
            <Square className="w-3.5 h-3.5" />
          </Button>
        )}

        {canRestart && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRestartDialog(true)}
            isLoading={actionLoading === "restart"}
            className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30"
            title="Restart Container"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRemoveDialog(true)}
          isLoading={actionLoading === "remove"}
          className="h-7 px-2 text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30"
          title="Remove Deployment"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>

        {/* Dialogs */}
        <ConfirmDialog
          isOpen={showStopDialog}
          title="Stop Container Deployment"
          description="Are you sure you want to stop this container? Incoming network traffic to this deployment's subdomain or port will temporarily fail until restarted."
          confirmText="Stop Container"
          variant="danger"
          isLoading={actionLoading === "stop"}
          onConfirm={handleStop}
          onClose={() => setShowStopDialog(false)}
        />

        <ConfirmDialog
          isOpen={showRestartDialog}
          title="Restart Container"
          description="This will send a restart signal to the deployment container and rebind the mapped ports."
          confirmText="Restart Now"
          variant="primary"
          isLoading={actionLoading === "restart"}
          onConfirm={handleRestart}
          onClose={() => setShowRestartDialog(false)}
        />

        <ConfirmDialog
          isOpen={showRemoveDialog}
          title="Remove Deployment"
          description="Are you sure you want to permanently remove this deployment and destroy its running container? This action cannot be undone."
          confirmText="Remove Deployment"
          variant="danger"
          isLoading={actionLoading === "remove"}
          onConfirm={handleRemove}
          onClose={() => setShowRemoveDialog(false)}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {canStart && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleStart}
          isLoading={actionLoading === "start"}
          leftIcon={<Play className="w-3.5 h-3.5 text-cyan-400" />}
          className="text-xs text-cyan-400 hover:text-cyan-300 hover:border-cyan-800"
        >
          Start
        </Button>
      )}

      {canStop && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowStopDialog(true)}
          isLoading={actionLoading === "stop"}
          leftIcon={<Square className="w-3.5 h-3.5 text-rose-400" />}
          className="text-xs text-rose-400 hover:text-rose-300 hover:border-rose-800"
        >
          Stop
        </Button>
      )}

      {canRestart && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowRestartDialog(true)}
          isLoading={actionLoading === "restart"}
          leftIcon={<RotateCcw className="w-3.5 h-3.5 text-cyan-400" />}
          className="text-xs text-cyan-300 hover:text-cyan-200"
        >
          Restart
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowRemoveDialog(true)}
        isLoading={actionLoading === "remove"}
        leftIcon={<Trash2 className="w-3.5 h-3.5 text-zinc-500" />}
        className="text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
      >
        Remove
      </Button>

      {/* Safety Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showStopDialog}
        title="Stop Container Deployment"
        description="Are you sure you want to stop this container? Incoming network traffic to this deployment's subdomain or port will temporarily fail until restarted."
        confirmText="Stop Container"
        variant="danger"
        isLoading={actionLoading === "stop"}
        onConfirm={handleStop}
        onClose={() => setShowStopDialog(false)}
      />

      <ConfirmDialog
        isOpen={showRestartDialog}
        title="Restart Container"
        description="This will send a restart signal to the deployment container and rebind the mapped ports."
        confirmText="Restart Now"
        variant="primary"
        isLoading={actionLoading === "restart"}
        onConfirm={handleRestart}
        onClose={() => setShowRestartDialog(false)}
      />

      <ConfirmDialog
        isOpen={showRemoveDialog}
        title="Remove Deployment"
        description="Are you sure you want to permanently remove this deployment and destroy its running container? This action cannot be undone."
        confirmText="Remove Deployment"
        variant="danger"
        isLoading={actionLoading === "remove"}
        onConfirm={handleRemove}
        onClose={() => setShowRemoveDialog(false)}
      />
    </div>
  );
}
