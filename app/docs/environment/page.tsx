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
  title: "Environment Variables — KotaCloud Spaces Docs",
  description: "Daftar env vars yang di-inject otomatis oleh platform dan cara menambahkan env Anda sendiri.",
};

export default function EnvironmentPage() {
  return (
    <article>
      <DocPageHeader
        title="Environment Variables"
        description="Platform menginjekt variabel lingkungan otomatis — PORT, alokasi service, dan koneksi antar service. Anda bisa menambahkan milik sendiri."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Environment Variables" }]}
      />

      <DocSection title="Injeksi otomatis oleh platform">
        <DocTable
          headers={["Variabel", "Kapan diisi", "Nilai"]}
          rows={[
            ["PORT", "Semua service", "Sama dengan Container Port yang ditetapkan — aplikasi Anda wajib listen di sini"],
            ["APP_NAME", "Semua service", "Nama service / aplikasi (untuk branding halaman dsb.)"],
            ["DATABASE_URL", "Service app dengan Postgres di project", "postgresql://user:pass@172.17.0.1:<host_port>/<db>?sslmode=disable"],
            ["POSTGRES_HOST / POSTGRES_PORT", "idem", "172.17.0.1 / host_port database"],
            ["MYSQL_HOST / MYSQL_PORT", "dengan MySQL/MariaDB", "172.17.0.1 / host_port"],
            ["MONGO_HOST / MONGO_PORT", "dengan MongoDB", "172.17.0.1 / host_port"],
            ["MONGODB_URI", "dengan MongoDB", "mongodb://user:pass@172.17.0.1:<host_port>/<db>"],
            ["REDIS_HOST / REDIS_PORT", "dengan Redis", "172.17.0.1 / host_port"],
            ["REDIS_URL", "dengan Redis", "redis://172.17.0.1:<host_port>"],
          ]}
        />
        <Callout type="warning" title="172.17.0.1 bukan typo">
          Ini adalah IP docker bridge HOST — jalur resmi antar container di KotaCloud. Aplikasi
          Anda harus membaca env ini, bukan <code>localhost</code>.
        </Callout>
      </DocSection>

      <DocSection title="Menambahkan custom env">
        <p>
          Buka halaman service → <strong>Environment Variables</strong> → tambahkan pasangan
          key-value → <strong>Save</strong> → <strong>Redeploy</strong>. Env baru berlaku pada
          container berikutnya. Contoh:
        </p>
        <CodeBlock
          language="text"
          title="Contoh env aplikasi"
          code={`NODE_ENV=production
LOG_LEVEL=debug
JWT_SECRET=<rahasia-anda>
SMTP_API_KEY=<rahasia>
API_BASE_URL=https://api.example.com`}
        />
        <Callout type="tip" title="Nilai rahasia">
          Env tersimpan di database dan tidak ditampilkan kembali setelah tersimpan (ditulis
          <code>-</code>). Yang bisa dilakukan hanyalah mengganti nilai. Redeploy diperlukan agar
          berlaku.
        </Callout>
      </DocSection>

      <DocSection title="Membaca env di berbagai stack">
        <CodeBlock
          language="javascript"
          title="Node.js"
          code={`const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL; // koneksi Postgres`}
        />
        <CodeBlock
          language="go"
          title="Go"
          code={`port := os.Getenv("PORT")
if port == "" { port = "8080" }
dsn := os.Getenv("DATABASE_URL")`}
        />
        <CodeBlock
          language="python"
          title="Python (FastAPI/Flask)"
          code={`import os
port = int(os.getenv("PORT", 8000))
db_url = os.getenv("DATABASE_URL")`}
        />
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/deploy-docker", label: "Deploy Docker Image" }}
        next={{ href: "/docs/resources", label: "Resource & Plan" }}
      />
    </article>
  );
}
