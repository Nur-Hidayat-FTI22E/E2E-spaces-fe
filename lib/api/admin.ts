import { apiClient } from "./client";

// ── Admin Port Audit ─────────────────────────────────────────────
// Endpoint: GET /api/v1/admin/ports (di backend, guard ADMIN_EMAIL)

export interface PortAllocation {
  port: number;
  state: "free" | "occupied" | "foreign";
  owner_type?: string;
  owner?: string;
  service_id?: string;
  status?: string;
  project_id?: string;
  user_email?: string;
  subdomain?: string;
}

export interface AdminPortsResponse {
  range_start: number;
  range_end: number;
  total_ports: number;
  occupied: number;
  free: number;
  foreign: number;
  ports: PortAllocation[];
}

export async function fetchAdminPorts(filter: "all" | "occupied" | "free" | "foreign" = "all") {
  return apiClient<{ success: boolean; data: AdminPortsResponse }>(`/admin/ports`, {
    params: { filter },
  });
}
