import { apiClient } from "./client";

export interface EngineHealthResponse {
  status: "ready" | "ok" | "healthy" | "offline" | "degraded" | string;
  version?: string;
  timestamp?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

/**
 * URL for real-time SSE stream of engine status
 */
export function getEngineHealthStreamUrl(): string {
  return `${API_BASE_URL.replace(/\/$/, "")}/system/engine/health/stream`;
}

/**
 * Check Control Plane & Engine health status from backend
 */
export async function getEngineHealthApi(): Promise<EngineHealthResponse> {
  return apiClient<EngineHealthResponse>("/system/engine/health", {
    skipAuth: true,
  });
}
