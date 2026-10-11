import { apiClient } from "@/lib/api/client";

// Snapshot penggunaan resource real-time (dari docker stats via backend).
export interface ServiceUsage {
  service_id: string;
  project_id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  subdomain?: string;
  host_port?: number;
  memory_limit_mb: number;
  cpus_limit: number;
  mem_used_mb: number;
  mem_percent: number;
  cpu_percent: number;
  net_rx_mb: number;
  net_tx_mb: number;
  running: boolean;
}

export interface UsageSummary {
  generated_at: string;
  plan: string;
  plan_max_services: number; // -1 = unlimited
  plan_max_memory_mb: number;
  plan_max_cpus: number;
  used_memory_mb: number;
  used_cpu_percent: number; // % host CPU (bisa >100 utk acumulasi multi-core)
  allocated_memory_mb: number;
  allocated_cpus: number;
  total_net_rx_mb: number;
  total_net_tx_mb: number;
  services_count: number;
  running_count: number;
  services: ServiceUsage[];
  engine_offline: boolean;
}

export async function getUsageApi(): Promise<UsageSummary> {
  return apiClient<UsageSummary>("/system/resources/usage");
}
