import { Deployment } from "./deployment";
import { Domain } from "./domain";

export type ServiceType = "WEB" | "FRONTEND" | "DATABASE" | "WORKER";
export type ServiceSourceType = "GIT" | "DOCKER" | "TEMPLATE";
export type ServiceStatus =
  | "IDLE"
  | "BUILDING"
  | "DEPLOYING"
  | "RUNNING"
  | "STOPPED"
  | "FAILED";

export interface Service {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description?: string;
  type: ServiceType;
  source_type: ServiceSourceType;
  status: ServiceStatus;
  repository_url?: string;
  branch?: string;
  root_dir?: string;
  docker_image?: string;
  subdomain?: string;
  container_port: number;
  host_port?: number;
  public_port?: number;
  memory_mb: number;
  cpus: number;
  env_vars?: Record<string, string>;
  auto_deploy?: boolean;
  last_commit_sha?: string;
  last_commit_msg?: string;
  git_token?: string;
  created_at: string;
  updated_at: string;
  deployments?: Deployment[];
  domains?: Domain[];
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  type?: ServiceType;
  source_type?: ServiceSourceType;
  repository_url?: string;
  branch?: string;
  root_dir?: string;
  docker_image?: string;
  subdomain?: string;
  container_port?: number;
  memory_mb?: number;
  cpus?: number;
  env_vars?: Record<string, string>;
  auto_deploy?: boolean;
  git_token?: string;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  repository_url?: string;
  branch?: string;
  root_dir?: string;
  docker_image?: string;
  subdomain?: string;
  container_port?: number;
  memory_mb?: number;
  cpus?: number;
  env_vars?: Record<string, string>;
  auto_deploy?: boolean;
  git_token?: string;
}

export interface DeployServiceRequest {
  repository_url?: string;
  branch?: string;
  git_token?: string;
}

export interface ServiceListResponse {
  services: Service[];
  total: number;
}

// ProjectServiceSummary adalah ringkasan service yang dikirim backend di
// dalam response GET /projects (untuk kartu project di dashboard).
export interface ProjectServiceSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  subdomain: string;
  host_port: number;
}
