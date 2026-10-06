export type DomainType = "SUBDOMAIN" | "CUSTOM";

export interface Domain {
  id: string;
  project_id: string;
  service_id?: string;
  domain: string;
  type: DomainType;
  redirect_to?: string;
  redirect_code?: number;
  dns_config?: DNSConfig | null;
  created_at: string;
  updated_at: string;
}

// Satu record instruksi DNS yang digenerate backend (internal/dto/domain.go).
export interface DNSRecord {
  type: string; // CNAME | A | AAAA | ALIAS
  name: string; // e.g. "api" atau "@" untuk apex
  value: string; // target CNAME atau alamat IP
  ttl: string;
  proxy: string; // rekomendasi proxy, e.g. "DNS only"
  proxy_on?: boolean; // true bila proxy wajib ON
  note?: string; // catatan tambahan per record
}

// Ringkasan hasil pemeriksaan DNS terakhir (dari backend).
export interface DNSVerification {
  method: string; // "CNAME" | "A" | "AAAA" | "NONE" | "NOT_CHECKED"
  target: string;
  found?: string;
  attempts?: number;
  note?: string;
}

// Konfigurasi DNS tergenerate untuk custom domain (dari backend).
export interface DNSConfig {
  domain: string;
  cname_host: string; // "@" bila domain apex
  is_apex: boolean;
  recommended: string; // "CNAME" | "A" | "ALIAS"
  records: DNSRecord[];
  verified: boolean;
  checked_at?: string;
  verification?: DNSVerification;
}

export interface DomainListResponse {
  domains: Domain[];
  total: number;
}
