import { apiClient } from "@/lib/api/client";
import {
  Deployment,
  DeploymentListResponse,
  DeploymentLogsResponse,
} from "@/types/deployment";

export interface CreateGitDeploymentPayload {
  repository_url: string;
  branch?: string;
  subdomain: string;
  container_port: number;
  memory_mb?: number;
  cpus?: number;
  env_vars?: Record<string, string>;
}

export interface CreateDockerDeploymentPayload {
  docker_image: string;
  container_port: number;
  public_port?: number;
  memory_mb?: number;
  cpus?: number;
  env_vars?: Record<string, string>;
}

export interface CreateLocalDeploymentPayload {
  file: File;
  subdomain: string;
  container_port: number;
  memory_mb?: number;
  cpus?: number;
}

export async function createGitDeploymentApi(
  projectId: string,
  payload: CreateGitDeploymentPayload
): Promise<{ deployment: Deployment; message: string }> {
  return apiClient<{ deployment: Deployment; message: string }>(
    `/projects/${projectId}/deployments/git`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function createDockerDeploymentApi(
  projectId: string,
  payload: CreateDockerDeploymentPayload
): Promise<{ deployment: Deployment; message: string }> {
  return apiClient<{ deployment: Deployment; message: string }>(
    `/projects/${projectId}/deployments/docker`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function createLocalDeploymentApi(
  projectId: string,
  payload: CreateLocalDeploymentPayload
): Promise<{ deployment: Deployment; message: string }> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("subdomain", payload.subdomain);
  formData.append("container_port", String(payload.container_port));
  if (payload.memory_mb) {
    formData.append("memory_mb", String(payload.memory_mb));
  }
  if (payload.cpus) {
    formData.append("cpus", String(payload.cpus));
  }

  return apiClient<{ deployment: Deployment; message: string }>(
    `/projects/${projectId}/deployments/upload`,
    {
      method: "POST",
      body: formData,
    }
  );
}

export async function listDeploymentsApi(
  projectId: string
): Promise<DeploymentListResponse> {
  return apiClient<DeploymentListResponse>(`/projects/${projectId}/deployments`);
}

export async function getDeploymentApi(id: string): Promise<Deployment> {
  return apiClient<Deployment>(`/deployments/${id}`);
}

export async function getDeploymentLogsApi(
  id: string,
  level?: string,
  limit?: number
): Promise<DeploymentLogsResponse> {
  return apiClient<DeploymentLogsResponse>(`/deployments/${id}/logs`, {
    params: { level, limit },
  });
}

export async function startDeploymentApi(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/deployments/${id}/start`, {
    method: "POST",
  });
}

export async function stopDeploymentApi(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/deployments/${id}/stop`, {
    method: "POST",
  });
}

export async function restartDeploymentApi(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/deployments/${id}/restart`, {
    method: "POST",
  });
}

export async function removeDeploymentApi(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/deployments/${id}`, {
    method: "DELETE",
  });
}

export async function getContainerLogsApi(
  id: string,
  tail?: number
): Promise<{
  project_id: string;
  container_name: string;
  status: string;
  count: number;
  logs: Array<{
    id: string;
    project_id: string;
    phase: string;
    source: string;
    stream: string;
    level: string;
    message: string;
    timestamp: string;
  }>;
}> {
  return apiClient(`/deployments/${id}/container-logs`, {
    params: { tail },
  });
}

