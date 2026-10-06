import React from "react";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { DeploymentStatus } from "@/types/deployment";

interface ProjectStatusBadgeProps {
  status?: DeploymentStatus | string;
  className?: string;
}

export function ProjectStatusBadge({
  status = "READY",
  className = "",
}: ProjectStatusBadgeProps) {
  const normalized = status.toUpperCase();

  let variant: BadgeVariant = "zinc";
  let pulseDot = false;
  let showDot = true;

  switch (normalized) {
    case "RUNNING":
      variant = "green";
      pulseDot = true;
      break;
    case "BUILDING":
    case "DEPLOYING":
      variant = "yellow";
      pulseDot = true;
      break;
    case "QUEUED":
      variant = "zinc";
      break;
    case "FAILED":
      variant = "red";
      break;
    case "STOPPED":
      variant = "zinc";
      break;
    case "REMOVED":
      variant = "zinc";
      showDot = false;
      break;
    case "READY":
    default:
      variant = "cyan";
      break;
  }

  return (
    <Badge
      variant={variant}
      showDot={showDot}
      pulseDot={pulseDot}
      className={className}
    >
      {normalized}
    </Badge>
  );
}
