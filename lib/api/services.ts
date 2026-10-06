import { apiClient } from "@/lib/api/client";
import {
  Service,
  ServiceListResponse,
  CreateServiceRequest,
  UpdateServiceRequest,
  DeployServiceRequest,
} from "@/types/service";

export async function createServiceApi(
  projectId: string,
  data: CreateServiceRequest
): Promise<Service> {
  return apiClient<Service>(`/projects/${projectId}/services`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listProjectServicesApi(
  projectId: string
): Promise<ServiceListResponse> {
  return apiClient<ServiceListResponse>(`/projects/${projectId}/services`);
}

export async function getServiceApi(serviceId: string): Promise<Service> {
  return apiClient<Service>(`/services/${serviceId}`);
}

export async function updateServiceApi(
  serviceId: string,
  data: UpdateServiceRequest
): Promise<Service> {
  return apiClient<Service>(`/services/${serviceId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteServiceApi(
  serviceId: string
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/services/${serviceId}`, {
    method: "DELETE",
  });
}

export async function deployServiceApi(
  serviceId: string,
  data?: DeployServiceRequest
): Promise<Service> {
  return apiClient<Service>(`/services/${serviceId}/deploy`, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function startServiceApi(
  serviceId: string
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/services/${serviceId}/start`, {
    method: "POST",
  });
}

export async function stopServiceApi(
  serviceId: string
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/services/${serviceId}/stop`, {
    method: "POST",
  });
}

export async function restartServiceApi(
  serviceId: string
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/services/${serviceId}/restart`, {
    method: "POST",
  });
}
