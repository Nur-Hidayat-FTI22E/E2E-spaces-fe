// Mirror katalog plan backend:
//   kotacloud-spaces-backend-main/internal/model/billing.go → AvailablePlans
//
// Dipakai sebagai fallback tampilan saat GET /api/v1/billing/plans belum termuat
// atau gagal, sehingga halaman Plans / Subscribe / Billing tetap render normal.
//
// ⚠️ Jangan mengubah definisi di sini tanpa menyamakan katalog backend
// (atau sebaliknya) — file ini sengaja dibuat sebagai satu-satunya tempat
// fallback agar tidak bisa saling beda antar halaman.
import type { PlanDefinition } from "@/lib/api/billing";

export const FALLBACK_PLANS: Record<PlanDefinition["id"], PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    price_idr: 0,
    price_formatted: "Rp 0",
    price_usd_equiv: "$0",
    billing_period: "Free forever",
    max_projects: 1,
    max_services: 1,
    memory_mb_per_service: 256,
    cpu_share: 0.25,
    highlight: "For Learning & Experimentation",
    is_popular: false,
    features: [
      "1 Project workspace",
      "1 Containerized service",
      "256 MB RAM per service",
      "0.25 vCPU limit",
      "GitHub & GitLab Auto-Deploy",
      "Auto-sleep after 30 mins idle",
      "Shared kota.space domain",
      "Community Support via Discord",
    ],
  },
  developer: {
    id: "developer",
    name: "Developer",
    price_idr: 49000,
    price_formatted: "Rp 49.000",
    price_usd_equiv: "~$3",
    billing_period: "per month",
    max_projects: 3,
    max_services: 5,
    memory_mb_per_service: 512,
    cpu_share: 0.5,
    highlight: "Favorite for Indie Developers",
    is_popular: false,
    features: [
      "3 Project workspaces",
      "5 Services across projects",
      "512 MB RAM per service",
      "0.5 vCPU compute limit",
      "1 Managed Database (Postgres, MySQL, Redis)",
      "GitHub & GitLab Auto-Deploy",
      "Custom Domain support (Free SSL)",
      "Always On (No sleep)",
      "Standard Email & Discord Support",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    price_idr: 149000,
    price_formatted: "Rp 149.000",
    price_usd_equiv: "~$9",
    billing_period: "per month",
    max_projects: -1,
    max_services: 10,
    memory_mb_per_service: 2048,
    cpu_share: 1.0,
    highlight: "Most Popular & Recommended",
    is_popular: true,
    features: [
      "Unlimited Project workspaces",
      "10 High-performance services",
      "2 GB RAM per service",
      "1.0 vCPU compute limit",
      "Unlimited Managed Databases",
      "GitHub & GitLab Auto-Deploy",
      "Instant Let's Encrypt SSL provisioning",
      "Priority Fast-Response Support",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    price_idr: 499000,
    price_formatted: "Rp 499.000",
    price_usd_equiv: "~$30",
    billing_period: "per month",
    max_projects: -1,
    max_services: -1,
    memory_mb_per_service: 8192,
    cpu_share: 4.0,
    highlight: "For Startups & Production Teams",
    is_popular: false,
    features: [
      "Unlimited Projects & Services",
      "8 GB RAM per service",
      "4.0 vCPU high-concurrency limit",
      "GitHub & GitLab Auto-Deploy",
      "Team Collaboration & multi-seat",
      "Automated Database Backup & Restore",
      "Horizontal Auto-scaling ready",
      "99.5% High Availability SLA",
      "Dedicated 24/7 Priority Support",
    ],
  },
};

// Urutan kanonik sesuai katalog backend (hierarki Starter → Business).
export const FALLBACK_PLAN_LIST: PlanDefinition[] = [
  FALLBACK_PLANS.starter,
  FALLBACK_PLANS.developer,
  FALLBACK_PLANS.professional,
  FALLBACK_PLANS.business,
];

// Ambil definisi fallback berdasarkan id; default ke Developer bila tidak dikenal.
export function getFallbackPlan(id: string | null | undefined): PlanDefinition {
  if (id && id in FALLBACK_PLANS) {
    return FALLBACK_PLANS[id as PlanDefinition["id"]];
  }
  return FALLBACK_PLANS.developer;
}
