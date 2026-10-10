import type { Metadata } from "next";
import Link from "next/link";
import {
  DocPageHeader,
  DocSection,
  CodeBlock,
  Callout,
  PreviousNext,
  InlineCode,
} from "@/components/docs/doc-ui";
import {
  GitBranch,
  Container,
  Database,
  Globe,
  ShieldCheck,
  Gauge,
  Rocket,
  TerminalSquare,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pengenalan — KotaCloud Spaces Docs",
  description:
    "KotaCloud Spaces adalah platform deployment self-service: deploy dari repository Git atau Docker image dengan domain HTTPS otomatis, database terkelola, dan skala resource per-plan.",
};

const FEATURES = [
  {
    icon: GitBranch,
    title: "Deploy dari Git",
    desc: "Push ke GitHub/GitLab dan aplikasi otomatis dibangun serta di-deploy. Auto-deploy per branch dan status check ke pull request.",
  },
  {
    icon: Container,
    title: "Docker Image",
    desc: "Deploy langsung image publik maupun private — cocok untuk stack arbitrary tanpa repo (nginx, redis, app kustom Anda).",
  },
  {
    icon: Database,
    title: "Database Terkelola",
    desc: "PostgreSQL, MySQL, MariaDB, MongoDB, dan Redis dengan volume persisten serta env var koneksi otomatis.",
  },
  {
    icon: Globe,
    title: "HTTPS Otomatis",
    desc: "Setiap service mendapat subdomain *.kotacloud.com dengan TLS platform; custom domain memakai Let's Encrypt per-domain.",
  },
  {
    icon: Gauge,
    title: "Resource per Plan",
    desc: "Memory & vCPU mengikuti paket Anda (Starter/Professional/Business), dengan clamp otomatis ke kapasitas host fisik.",
  },
  {
    icon: ShieldCheck,
    title: "Container Hardened",
    desc: "Capability minimal, no-new-privileges, lima ratus PID limit, dan publish lokal 127.0.0.1 — tidak terekspos publik langsung.",
  },
];

const QUICK_ACTIONS = [
  {
    icon: Rocket,
    title: "Quickstart",
    desc: "Deploy aplikasi pertama Anda dalam 5 menit.",
    href: "/docs/quickstart",
  },
  {
    icon: GitBranch,
    title: "Deploy dari Git",
    desc: "Sambungkan repo, konfigurasi branch & build.",
    href: "/docs/deploy-git",
  },
  {
    icon: Database,
    title: "Database",
    desc: "Provisioning Postgres/Redis/MySQL/Mongo.",
    href: "/docs/databases",
  },
  {
    icon: TerminalSquare,
    title: "REST API",
    desc: "Integrasikan platform via HTTP API.",
    href: "/docs/api",
  },
];

export default function DocsIntroPage() {
  return (
    <article>
      <DocPageHeader
        title="Pengenalan"
        description="KotaCloud Spaces adalah platform PaaS self-service untuk membangun, menjalankan, dan menskalakan aplikasi modern — dari repo Git, Docker image, hingga database terkelola — dengan jaringan HTTPS otomatis dan model resource per-plan."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Pengenalan" }]}
      />

      <DocSection title="Apa itu KotaCloud Spaces?">
        <p>
          KotaCloud Spaces membungkus workflow modern (build → deploy → route → scale) menjadi
          satu platform yang bisa dipakai tim tanpa mengelola server. Anda mendaftarkan
          <strong> project</strong>, menambahkan <strong>service</strong> (aplikasi web, API, worker,
          atau database), dan platform yang menangani sisanya:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Build otomatis dari repo Git, atau pull langsung dari Docker image.</li>
          <li>Container dijalankan hardening ketat dan dipublish hanya ke jaringan internal host.</li>
          <li>Semua traffic publik masuk melalui ingress Nginx dengan TLS dan routing per-subdomain.</li>
          <li>Service-to-service berkomunikasi lewat Docker bridge (<InlineCode>172.17.0.1</InlineCode>) — env var koneksi disiapkan otomatis.</li>
          <li>Resource CPU/RAM dibatasi sesuai plan dan di-clamp ke kapasitas host fisik.</li>
        </ul>
      </DocSection>

      <DocSection title="Kemampuan utama">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-white/[0.07] bg-[#0c0d10] p-4">
              <f.icon className="w-5 h-5 text-cyan-400 mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection title="Semua berangkat dari satu UI">
        <p>
          Setelah mendaftar, Anda masuk ke <strong>Workspace</strong>: membuat project, service,
          memicu deploy, memantau log real-time, mengelola domain dan billing — semuanya dari
          browser. Bagi yang butuh integrasi, seluruh operasional terekspos via{" "}
          <Link href="/docs/api" className="text-cyan-300 hover:underline">REST API</Link> dan{" "}
          <Link href="/docs/webhooks" className="text-cyan-300 hover:underline">webhooks</Link>.
        </p>
        <CodeBlock
          language="bash"
          title="Postman / curl — contoh membuat project"
          code={`curl -X POST https://spaces.kotacloud.com/api/v1/projects \\
  -H "Authorization: Bearer $KOTACLOUD_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"aplikasi-saya"}'`}
        />
      </DocSection>

      <DocSection title="Langkah berikutnya">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group rounded-lg border border-white/[0.07] bg-[#0c0d10] p-4 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <a.icon className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-300 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-white mt-2 mb-0.5">{a.title}</h3>
              <p className="text-xs text-zinc-500">{a.desc}</p>
            </Link>
          ))}
        </div>
      </DocSection>

      <Callout type="tip" title="Butuh bantuan cepat?">
        Semua halaman docs punya navigasi sidebar di kiri dan pencarian di atas. Untuk pertanyaan
        teknis, hubungi tim via email support yang tertera pada halaman billing.
      </Callout>

      <PreviousNext next={{ href: "/docs/quickstart", label: "Quickstart" }} />
    </article>
  );
}
