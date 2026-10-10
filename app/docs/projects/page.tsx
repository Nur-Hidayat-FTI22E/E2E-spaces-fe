import type { Metadata } from "next";
import {
  DocPageHeader,
  DocSection,
  CodeBlock,
  Callout,
  PreviousNext,
  InlineCode,
  DocTable,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Project & Service — KotaCloud Spaces Docs",
  description: "Cara membuat dan mengelola project serta service di KotaCloud Spaces.",
};

export default function ProjectsPage() {
  return (
    <article>
      <DocPageHeader
        title="Project & Service"
        description="Project mengelompokkan aplikasi Anda; service adalah unit deployment yang berjalan. Di halaman ini: membuat, atribut penting, dan siklus hidup."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Project & Service" }]}
      />

      <DocSection title="Membuat Project">
        <p>
          Dari <InlineCode>/workspace/projects</InlineCode>, klik <strong>New Project</strong> dan
          beri nama. Nama menjadi slug unik untuk URL workspace.
        </p>
        <CodeBlock
          language="bash"
          code={`curl -X POST https://spaces.kotacloud.com/api/v1/projects \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"invoice-app"}'`}
        />
      </DocSection>

      <DocSection title="Membuat Service">
        <p>Di dalam project, klik <strong>Add Service</strong>, lalu pilih source:</p>
        <DocTable
          headers={["Source", "Detail isian"]}
          rows={[
            ["Git", "Repo URL (GitHub/GitLab), branch, root directory, auto-deploy toggle"],
            ["Docker", "Image (mis. nginx:alpine), optional custom command*"],
            ["Database", "Jenis database (postgres/mysql/mariadb/mongo/redis) — image & port disiapkan"],
          ]}
        />
        <Callout type="info" title="Container Port">
          <p>
            Isi <InlineCode>Container Port</InlineCode> sesuai port yang didengarkan aplikasi Anda
            (8080 untuk Spring Boot, 3000 untuk Next.js, 80 untuk image siap-produksi). Platform
            menggunakan ini untuk mengerahkan traffic ingress.
          </p>
        </Callout>
        <p className="text-xs text-zinc-600">*custom command masih dalam pengembangan.</p>
      </DocSection>

      <DocSection title="Kuota resource (per plan)">
        <p>
          Saat service dibuat, <InlineCode>memory_mb</InlineCode> dan <InlineCode>cpus</InlineCode>{" "}
          otomatis diisi <strong>nilai maksimum plan</strong> Anda. Anda boleh menurunkannya
          (hemat), tetapi tidak bisa melebihi plan max — nilai kelebihan dipotong (clamp) saat
          deploy. Detail di <InlineCode>/docs/resources</InlineCode>.
        </p>
      </DocSection>

      <DocSection title="Siklus hidup service">
        <DocTable
          headers={["Status", "Arti"]}
          rows={[
            ["IDLE", "Service terdaftar, belum pernah deploy"],
            ["BUILDING", "Sedang build / pull image"],
            ["DEPLOYING", "Container sedang dijalankan"],
            ["RUNNING", "Hidup & di-route"],
            ["STOPPED", "Dihentikan manual (container dibuang)"],
            ["FAILED", "Build/deploy gagal — lihat log"],
          ]}
        />
        <p>
          Operasi dari UI: <strong>Deploy</strong>, <strong>Stop</strong>, <strong>Restart</strong>,
          <strong> Delete</strong>. <code>Stop</code> menghentikan container tanpa menghapus baris
          service; mulai lagi akan menjalankan image yang sama.
        </p>
      </DocSection>

      <DocSection title="Helper antar service">
        <p>
          Service database otomatis menyiapkan env var untuk service app — mis. untuk Postgres:
        </p>
        <CodeBlock
          language="bash"
          title="Contoh env otomatis"
          code={`DATABASE_URL=postgresql://<user>:<pass>@172.17.0.1:<host_port>/<db>?sslmode=disable
POSTGRES_HOST=172.17.0.1
POSTGRES_PORT=<host_port>`}
        />
        <p>
          SQLAlchemy/Prisma/Go-pq cukup membaca <InlineCode>DATABASE_URL</InlineCode>. Detail di{" "}
          <InlineCode>/docs/environment</InlineCode>.
        </p>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/concepts", label: "Konsep Inti" }}
        next={{ href: "/docs/deploy-git", label: "Deploy dari Git" }}
      />
    </article>
  );
}
