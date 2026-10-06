export type DeploymentType = "GIT" | "DOCKER" | "LOCAL";

export type DeploymentStatus =
  | "QUEUED"
  | "BUILDING"
  | "DEPLOYING"
  | "RUNNING"
  | "STOPPED"
  | "FAILED"
  | "REMOVED";

export interface Deployment {
  id: string;
  project_id: string;
  type: DeploymentType;
  status: DeploymentStatus;
  repository_url?: string;
  branch?: string;
  commit_sha?: string;
  commit_message?: string;
  docker_image?: string;
  subdomain?: string;
  host_port?: number;
  container_port?: number;
  public_port?: number;
  memory_mb: number;
  cpus: number;
  env_vars?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface DeploymentListResponse {
  deployments: Deployment[];
  total: number;
}

export interface DeploymentLog {
  id: string;
  deployment_id: string;
  message: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  source?: string;
  created_at: string;
}

export interface DeploymentLogsResponse {
  logs: DeploymentLog[];
  total: number;
}
