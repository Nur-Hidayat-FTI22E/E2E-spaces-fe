import { apiClient } from "@/lib/api/client";
import {
  Project,
  ProjectListResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/types/project";
import { DeploymentListResponse } from "@/types/deployment";
import { Domain, DomainListResponse } from "@/types/domain";

export async function listProjectsApi(): Promise<ProjectListResponse> {
  return apiClient<ProjectListResponse>("/projects");
}

export async function getProjectApi(id: string): Promise<Project> {
  return apiClient<Project>(`/projects/${id}`);
}

export async function createProjectApi(data: CreateProjectRequest): Promise<Project> {
  return apiClient<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProjectApi(
  id: string,
  data: UpdateProjectRequest
): Promise<Project> {
  return apiClient<Project>(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProjectApi(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/projects/${id}`, {
    method: "DELETE",
  });
}

export async function getProjectDeploymentsApi(
  projectId: string
): Promise<DeploymentListResponse> {
  return apiClient<DeploymentListResponse>(`/projects/${projectId}/deployments`);
}

export async function getProjectDomainsApi(
  projectId: string
): Promise<DomainListResponse> {
  return apiClient<DomainListResponse>(`/projects/${projectId}/domains`);
}

export async function createProjectDomainApi(
  projectId: string,
  data: {
    domain: string;
    type: "SUBDOMAIN" | "CUSTOM";
    service_id?: string;
    redirect_to?: string;
    redirect_code?: number;
  }
): Promise<Domain> {
  return apiClient<Domain>(`/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDomainApi(
  domainId: string,
  data: {
    domain?: string;
    redirect_to?: string;
    redirect_code?: number;
    /** uuid = pindah ke service lain dalam project yang sama; "" = detach. */
    service_id?: string;
  }
): Promise<Domain> {
  return apiClient<Domain>(`/domains/${domainId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDomainApi(domainId: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/domains/${domainId}`, {
    method: "DELETE",
  });
}

export async function getDomainApi(domainId: string): Promise<Domain> {
  return apiClient<Domain>(`/domains/${domainId}`);
}

// Checker pra-save custom domain: format, ketersediaan, dan DNS live.
// Read-only — tidak membuat/mengubah record.
export interface DomainValidationCheck {
  check: "format" | "available" | "dns";
  ok: boolean;
  detail?: string;
}

export interface DomainValidation {
  domain: string;
  valid: boolean;
  checks: DomainValidationCheck[];
  dns_config?: import("@/types/domain").DNSConfig;
}

export async function validateDomainApi(
  domain: string,
  excludeDomainId?: string
): Promise<DomainValidation> {
  return apiClient<DomainValidation>(`/domains/validate`, {
    method: "POST",
    body: JSON.stringify({
      domain,
      exclude_domain_id: excludeDomainId || undefined,
    }),
  });
}

// Lakukan lookup DNS nyata (CNAME/A) untuk domain dan simpan status verifikasinya.
export async function verifyDomainDnsApi(domainId: string): Promise<Domain> {
  return apiClient<Domain>(`/domains/${domainId}/dns/verify`, {
    method: "POST",
  });
}

