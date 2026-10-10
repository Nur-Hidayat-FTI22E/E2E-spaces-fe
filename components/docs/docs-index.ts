// Index sub-bagian tiap halaman docs — dipakai pencarian "search juga sub-bagian".
// Disiapkan manual agar pencarian bekerja tanpa server; id HARUS cocok dengan id yang
// dihasilkan komponen OnThisPage (slug dari text heading).

export interface DocHeading {
  id: string;
  text: string;
}
export interface DocPageHeading {
  href: string;
  title: string;
  headings: DocHeading[];
}

const slug = (text: string) =>
  text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 64) || "sect";

// Helper penulisan: biar singkat di bawah.
const hs = (items: string[]): DocHeading[] => {
  const seen = new Map<string, number>();
  return items.map((t) => {
    const base = slug(t);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const id = n > 0 ? `${base}-${n}` : base;
    return { id, text: t };
  });
};

export const DOC_PAGE_HEADINGS: DocPageHeading[] = [
  {
    href: "/docs",
    title: "Pengenalan",
    headings: hs([
      "Apa itu KotaCloud Spaces?",
      "Kemampuan utama",
      "Semua berangkat dari satu UI",
      "Langkah berikutnya",
    ]),
  },
  {
    href: "/docs/quickstart",
    title: "Quickstart",
    headings: hs([
      "1. Daftar & masuk Workspace",
      "2. Buat Project",
      "3. Tambah Service",
      "4. Deploy dalam satu klik",
      "5. Akses aplikasi Anda",
      "6. Tambahan opsional",
    ]),
  },
  {
    href: "/docs/concepts",
    title: "Konsep Inti",
    headings: hs([
      "Project",
      "Service",
      "Deployment",
      "Build Engine (worker)",
      "Ingress (Nginx)",
      "Jaringan antar service",
    ]),
  },
  {
    href: "/docs/projects",
    title: "Project & Service",
    headings: hs([
      "Membuat Project",
      "Membuat Service",
      "Kuota resource (per plan)",
      "Siklus hidup service",
      "Helper antar service",
    ]),
  },
  {
    href: "/docs/deploy-git",
    title: "Deploy dari Git",
    headings: hs([
      "1. Sambungkan repository",
      "2. Branch & auto-deploy",
      "3. Proses build",
      "4. Health check pasca deploy",
      "5. Redeploy & rollback",
    ]),
  },
  {
    href: "/docs/deploy-docker",
    title: "Deploy Docker Image",
    headings: hs([
      "Membuat service Docker",
      "Hardening container",
      "Redeploy & persistensi data",
      "Contoh end-to-end (nginx)",
    ]),
  },
  {
    href: "/docs/environment",
    title: "Environment Variables",
    headings: hs([
      "Injeksi otomatis oleh platform",
      "Menambahkan custom env",
      "Membaca env di berbagai stack",
    ]),
  },
  {
    href: "/docs/resources",
    title: "Resource & Plan",
    headings: hs([
      "Semantik batas (plan max)",
      "Plan & kuota default",
      "Memilih nilai sendiri",
      "Upgrade plan",
      "Port allocation",
    ]),
  },
  {
    href: "/docs/databases",
    title: "Database Terkelola",
    headings: hs([
      "Provisioning",
      "Koneksi dari aplikasi Anda",
      "Query database dari platform",
      "Persistensi & redeploy",
      "Skala & limit",
    ]),
  },
  {
    href: "/docs/custom-domains",
    title: "Custom Domain",
    headings: hs([
      "1. Tambahkan domain ke service",
      "2. Setup DNS",
      "3. Verifikasi otomatis",
      "4. Sertifikat TLS (Let's Encrypt)",
      "Redirect domain lain ke domain utama",
      "Mitigasi umum",
    ]),
  },
  {
    href: "/docs/streaming",
    title: "SSE & Streaming",
    headings: hs([
      "Apa yang sudah dikonfigurasi",
      "Pola Server-Sent Events",
      "Pola-trauma yang sudah diatasi",
    ]),
  },
  {
    href: "/docs/logs",
    title: "Log Deployment",
    headings: hs([
      "Build & deploy log",
      "Runtime container logs",
      "Mendiagnosis kegagalan umum",
      "Riwayat deployment",
    ]),
  },
  {
    href: "/docs/billing",
    title: "Billing & Plan",
    headings: hs([
      "Plan yang tersedia",
      "Siklus tagihan & invoice",
      "Pembayaran (Midtrans)",
      "Kapan resource saya berubah?",
    ]),
  },
  {
    href: "/docs/api",
    title: "REST API",
    headings: hs([
      "Autentikasi",
      "Projects & Services",
      "Deployments & logs",
      "Domains",
      "Database management",
      "System & admin",
      "Rate limit & skema error",
    ]),
  },
  {
    href: "/docs/webhooks",
    title: "Webhooks",
    headings: hs([
      "1. GitHub push → auto deploy",
      "2. Service deploy webhook (trigger manual)",
      "3. Callback engine → backend",
      "4. Midtrans payment callback",
    ]),
  },
  {
    href: "/docs/port-audit",
    title: "Audit Port 10001–20000",
    headings: hs([
      "Akses",
      "Klasifikasi status port",
      "Kolom pada tabel detail",
      "Kapan fitur ini berguna",
    ]),
  },
];
