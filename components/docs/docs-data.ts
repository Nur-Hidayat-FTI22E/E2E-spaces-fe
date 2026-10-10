export interface DocNavItem {
  label: string;
  href: string;
}
export interface DocNavGroup {
  title: string;
  items: DocNavItem[];
}

// Struktur navigasi dokumentasi (dipakai sidebar & pencarian).
export const DOC_NAV: DocNavGroup[] = [
  {
    title: "Memulai",
    items: [
      { label: "Pengenalan", href: "/docs" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "Konsep Inti", href: "/docs/concepts" },
    ],
  },
  {
    title: "Deployment",
    items: [
      { label: "Project & Service", href: "/docs/projects" },
      { label: "Deploy dari Git", href: "/docs/deploy-git" },
      { label: "Deploy Docker Image", href: "/docs/deploy-docker" },
      { label: "Environment Variables", href: "/docs/environment" },
      { label: "Resource & Plan", href: "/docs/resources" },
    ],
  },
  {
    title: "Data & Jaringan",
    items: [
      { label: "Database Terkelola", href: "/docs/databases" },
      { label: "Custom Domain", href: "/docs/custom-domains" },
      { label: "SSE & Streaming", href: "/docs/streaming" },
    ],
  },
  {
    title: "Operasional",
    items: [
      { label: "Log Deployment", href: "/docs/logs" },
      { label: "Billing & Plan", href: "/docs/billing" },
      { label: "REST API", href: "/docs/api" },
      { label: "Webhooks", href: "/docs/webhooks" },
    ],
  },
  {
    title: "Admin",
    items: [{ label: "Audit Port 10001–20000", href: "/docs/port-audit" }],
  },
];
