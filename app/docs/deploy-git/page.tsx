import type { Metadata } from "next";
import {
  DocPageHeader,
  DocSection,
  CodeBlock,
  Callout,
  PreviousNext,
  InlineCode,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Deploy dari Git — KotaCloud Spaces Docs",
  description: "Deploy aplikasi dari repo GitHub atau GitLab dengan build otomatis, auto-deploy, dan status check.",
};

export default function DeployGitPage() {
  return (
    <article>
      <DocPageHeader
        title="Deploy dari Git"
        description="Sambungkan repository, pilih branch, dan KotaCloud Spaces menangani build + deploy setiap push."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Deploy dari Git" }]}
      />

      <DocSection title="1. Sambungkan repository">
        <p>
          Saat membuat service bertipe <strong>Git</strong>, tempel URL repo HTTPS publik, atau
          sambungkan akun GitHub/GitLab via OAuth agar repo private ikut tersedia. Token akses
          disimpan terenkripsi dan dipakai engine saat build.
        </p>
        <CodeBlock
          language="text"
          title="Contoh repo URL"
          code={`https://github.com/<org>/<repo>.git
https://gitlab.com/<user>/<repo>.git`}
        />
        <Callout type="warning" title="Repo private">
          Gunakan integrasi OAuth (GitHub App / GitLab) atau sertakan token akses di URL hanya
          pada saat isian awal — token di-disable tampilan begitu tersimpan.
        </Callout>
      </DocSection>

      <DocSection title="2. Branch & auto-deploy">
        <p>
          Pilih branch yang men-trigger deployment (default <InlineCode>main</InlineCode>). Saat
          toggle <strong>Auto Deploy</strong> aktif:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Push ke branch tersebut → build + deploy otomatis.</li>
          <li>Commit SHA &amp; pesan commit ditampilkan di halaman service.</li>
          <li>Status check dikirim ke GitHub (pending → success/fail di commit &amp; PR).</li>
        </ul>
        <p>
          Secara alternatif, webhook repo bisa di-set manual ke{" "}
          <InlineCode>POST /api/v1/webhooks/github</InlineCode> dengan secret HMAC (dibuat di
          halaman service).
        </p>
      </DocSection>

      <DocSection title="3. Proses build">
        <p>
          Engine menyalin repository ke workspace sandbox lalu menjalankan build sesuai
          fingerprint stack:
        </p>
        <CodeBlock
          language="text"
          title="Urutan deteksi build"
          code={`package.json → npm ci && npm run build (Node)
go.mod       → go build ./cmd/<main> (Go)
requirements.txt / pyproject → pip install && gunicorn
Dockerfile   → docker build (bila ada)
index.html   → serving statis (fallback)`}
        />
        <Callout type="info" title="Build log streaming real-time">
          Semua keluaran build dapat dilihat di tab <strong>Logs</strong> service — baris demi
          baris, termasuk penurunan progress git/docker.
        </Callout>
      </DocSection>

      <DocSection title="4. Health check pasca deploy">
        <p>
          Setelah container start, engine memverifikasi status container tidak langsung{" "}
          <InlineCode>exited</InlineCode>. Bila ada crash (exit non-zero), deployment ditandai{" "}
          <strong>FAILED</strong> dan log 25 baris terakhir ditampilkan sebagai reason.
        </p>
        <CodeBlock
          language="text"
          title="Pola umum penyebab fail"
          code={`build: type error / missing module → perbaiki dependency
runtime: port bentrok dengan CONTAINER_PORT → cek env PORT
runtime: crash at boot (bad env) → cek Environment Variables`}
        />
      </DocSection>

      <DocSection title="5. Redeploy & rollback">
        <p>
          Klik <strong>Deploy</strong> pada service kapan saja untuk redeploy dari commit terakhir
          pada branch. Riwayat deployment dihapus-bertahap (3 terakhir dipertahankan+). Redeploy
          selalu:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>mempertahankan host port yang sama pada kondisi normal (konsistensi URL &amp; env),</li>
          <li>meregenerasi konfigurasi ingress sesuai port aktual (menghindari stale conf),</li>
          <li>menetapkan versi container baru sebelum yang lama dihentikan.</li>
        </ul>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/projects", label: "Project & Service" }}
        next={{ href: "/docs/deploy-docker", label: "Deploy Docker Image" }}
      />
    </article>
  );
}
