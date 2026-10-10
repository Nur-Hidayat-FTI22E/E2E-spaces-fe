import type { Metadata } from "next";
import {
  DocPageHeader,
  CodeBlock,
  DocSection,
  Callout,
  PreviousNext,
  InlineCode,
  DocTable,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Konsep Inti — KotaCloud Spaces Docs",
  description: "Model data dan arsitektur runtime KotaCloud Spaces: project, service, deployment, engine, dan ingress.",
};

export default function ConceptsPage() {
  return (
    <article>
      <DocPageHeader
        title="Konsep Inti"
        description="Empat entitas utama dan satu runtime yang bekerja bersama: memahami model ini membuat semua fitur platform mudah diprediksi."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Konsep Inti" }]}
      />

      <DocSection title="Project">
        <p>
          <strong>Project</strong> adalah grup logis untuk satu aplikasi/product — beri satu nama,
          satu workspace billing, dan sekumpulan service yang saling terkait. Semua service di
          project berbagi owner (user) dan kuota plan.
        </p>
      </DocSection>

      <DocSection title="Service">
        <p>
          <strong>Service</strong> adalah unit deployment yang berjalan terus: aplikasi web/API,
          worker, atau database. Setiap service punya:
        </p>
        <DocTable
          headers={["Atribut", "Arti"]}
          rows={[
            ["source_type", "GIT (repo), DOCKER (image), DATABASE (db image terkelola)"],
            ["container_port", "Port yang didengarkan aplikasi di dalam container"],
            ["host_port", "Port unik 10001–20000 yang dialokasikan platform untuk publish"],
            ["subdomain", "Label subdomain layanan → <label>-spaces2.kotacloud.com"],
            ["memory_mb / cpus", "Kuota resource — default & batas atas mengikuti plan"],
            ["env_vars", "Key-value yang di-inject saat container start (terlihat di halaman service)"],
          ]}
        />
      </DocSection>

      <DocSection title="Deployment">
        <p>
          Setiap penyebaban konten baru (manual deploy, <InlineCode>git push</InlineCode>, webhook)
          membuat <strong>Deployment</strong> baru dengan status yang dapat diamati:
        </p>
        <CodeBlock
          language="text"
          code={`QUEUED → BUILDING → DEPLOYING → RUNNING
                       ↘ FAILED          ↘ STOPPED`}
        />
        <p>
          Deployment baru selalu menggantikan deployment aktif lama (stop-before-create) sehingga
          tidak pernah ada dua container untuk satu service. Riwayat deployment tetap tersimpan
          untuk keamanan historis.
        </p>
      </DocSection>

      <DocSection title="Build Engine (worker)">
        <p>
          <strong>Engine</strong> adalah daemon di host yang menjalankan: build (clone + build),
          <code> docker run</code> dengan hardening, publish port, update proxy, dan monitoring.
          Backend mengirim job ke engine via API ter-autentikasi dan men-sinkron status/log
          berkala.
        </p>
        <Callout type="info" title="Hardening default">
          Setiap container tenant berjalan dengan <InlineCode>--cap-drop</InlineCode> (berbahaya
          dibuang; DB &amp; nginx mendapat CHOWN/SETUID/SETGID minimal),{" "}
          <InlineCode>no-new-privileges</InlineCode>, pids limit 512, dan{" "}
          <InlineCode>publish 127.0.0.1 : container_port</InlineCode> — jaringan publik{" "}
          <em>tidak pernah</em> menjangkau container langsung.
        </Callout>
      </DocSection>

      <DocSection title="Ingress (Nginx)">
        <p>
          <strong>Ingress</strong> adalah Nginx yang men-terminasi TLS dan route{" "}
          <InlineCode>*.kotacloud.com</InlineCode> ke <InlineCode>127.0.0.1&lt;host_port&gt;</InlineCode>{" "}
          milik container dalam. Konfigurasi per-service dihasilkan otomatis oleh engine dan
          di-regenerate pada setiap deploy agar selalu konsisten dengan port aktual.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>TLS wildcard platform untuk <InlineCode>*.kotacloud.com</InlineCode>.</li>
          <li>Let&apos;s Encrypt per domain untuk custom domain (terverifikasi DNS).</li>
          <li>Streaming: <InlineCode>proxy_buffering off</InlineCode> + timeout 1 jam (SSE/WebSocket aman).</li>
        </ul>
      </DocSection>

      <DocSection title="Jaringan antar service">
        <p>
          Container tenant dapat berkomunikasi satu sama lain melalui docker bridge{" "}
          <InlineCode>172.17.0.1:&lt;host_port&gt;</InlineCode>. Platform otomatis membuat env var
          koneksi (mis. <InlineCode>DATABASE_URL</InlineCode>, <InlineCode>REDIS_URL</InlineCode>)
          memakai host ini saat service database ditambahkan ke project.
        </p>
        <Callout type="warning" title="Jangan hardcode localhost">
          Aplikasi yang mengakses database wajib membaca{" "}
          <InlineCode>process.env.DATABASE_URL</InlineCode> (atau <InlineCode>*_HOST</InlineCode>{" "}
          sesuai database), bukan <InlineCode>localhost:5432</InlineCode>.
        </Callout>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/quickstart", label: "Quickstart" }}
        next={{ href: "/docs/projects", label: "Project & Service" }}
      />
    </article>
  );
}
