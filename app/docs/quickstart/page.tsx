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

export const metadata: Metadata = {
  title: "Quickstart — KotaCloud Spaces Docs",
  description: "Deploy aplikasi pertama Anda di KotaCloud Spaces dalam lima menit.",
};

export default function QuickstartPage() {
  return (
    <article>
      <DocPageHeader
        title="Quickstart"
        description="Deploy aplikasi pertama Anda dalam lima menit — dari pendaftaran sampai URL HTTPS yang bisa diakses publik."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Quickstart" }]}
      />

      <Callout type="info" title="Prasyarat">
        Akun KotaCloud Spaces (gratis), repository GitHub/GitLab atau Docker image publik, dan
        beberapa menit koneksi internet.
      </Callout>

      <DocSection title="1. Daftar & masuk Workspace">
        <p>
          Buka <Link href="/register" className="text-cyan-300 hover:underline">/register</Link>, daftar lewat
          email atau OAuth (GitHub/GitLab/Google). Setelah login Anda akan diarahkan ke{" "}
          <InlineCode>/workspace/projects</InlineCode> — pusat kendali semua aplikasi Anda.
        </p>
      </DocSection>

      <DocSection title="2. Buat Project">
        <p>
          Project adalah wadah yang mengelompokkan service (aplikasi + database yang saling
          terkait). Klik <strong>New Project</strong>, beri nama — mis. <InlineCode>aplikasi-saya</InlineCode>.
        </p>
      </DocSection>

      <DocSection title="3. Tambah Service">
        <p>
          Di dalam project, pilih tipe service:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Git</strong> — sambungkan repo GitHub/GitLab, pilih branch, platform build otomatis (Node, Go, Python, statis).</li>
          <li><strong>Docker</strong> — isi image publik, mis. <InlineCode>nginx:alpine</InlineCode> atau <InlineCode>traefik/whoami</InlineCode>.</li>
          <li><strong>Database</strong> — PostgreSQL, MySQL/MariaDB, MongoDB, atau Redis dengan volume persisten.</li>
        </ul>
        <p>
          Isi <InlineCode>Container Port</InlineCode> dengan port yang didengarkan aplikasi Anda
          (mis. 3000 untuk Node, 8080 untuk Go) lalu klik <strong>Create</strong>.
        </p>
      </DocSection>

      <DocSection title="4. Deploy dalam satu klik">
        <p>
          Klik <strong>Deploy</strong> pada service. Platform menjalankan pipeline:
        </p>
        <CodeBlock
          language="text"
          title="Alur deploy"
          code={`QUEUED → BUILDING (build / docker pull) → DEPLOYING (run container) → RUNNING`}
        />
        <p>
          Pantau proses dari tab <strong>Logs</strong> — semua keluaran build dan deploy di-streaming
          real-time.
        </p>
      </DocSection>

      <DocSection title="5. Akses aplikasi Anda">
        <p>
          Setelah status <strong className="text-emerald-400">RUNNING</strong>, service punya URL publik:
        </p>
        <CodeBlock
          language="text"
          title="URL otomatis"
          code={`https://<nama-service>-spaces2.kotacloud.com`}
        />
        <p>
          Semua request diakhiri TLS platform dan di-route ingress Nginx ke container Anda.
          Mode streaming (SSE/WebSocket) didukung: <InlineCode>proxy_buffering off</InlineCode> dan
          timeout panjang sudah terpasang di setiap vhost.
        </p>
      </DocSection>

      <DocSection title="6. Tambahan opsional">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Sambungkan <Link href="/docs/custom-domains" className="text-cyan-300 hover:underline">custom domain</Link> dengan DNS tertulis otomatis dan LE cert.</li>
          <li>Sesuaikan <Link href="/docs/environment" className="text-cyan-300 hover:underline">environment variables</Link> lalu redeploy.</li>
          <li>Pantau <Link href="/docs/logs" className="text-cyan-300 hover:underline">runtime logs</Link> tanpa redeploy.</li>
        </ul>
      </DocSection>

      <Callout type="tip" title="Deploy berikutnya">
        Setelah setup pertama, cukup <code>git push</code> — service Git terkait branch akan
        auto-deploy (bila diaktifkan). Redeploy menghasilkan port &amp; konfigurasi yang konsisten.
      </Callout>

      <PreviousNext
        prev={{ href: "/docs", label: "Pengenalan" }}
        next={{ href: "/docs/concepts", label: "Konsep Inti" }}
      />
    </article>
  );
}
