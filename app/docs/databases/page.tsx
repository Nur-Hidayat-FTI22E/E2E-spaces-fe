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
  title: "Database Terkelola — KotaCloud Spaces Docs",
  description: "Provisioning dan mengakses PostgreSQL, MySQL/MariaDB, MongoDB, dan Redis di KotaCloud Spaces.",
};

export default function DatabasesPage() {
  return (
    <article>
      <DocPageHeader
        title="Database Terkelola"
        description="Tambahkan database sebagai service — provisioning satu klik, volume persisten, dan env koneksi otomatis untuk aplikasi Anda."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Database Terkelola" }]}
      />

      <DocSection title="Provisioning">
        <p>
          Di dalam project, <strong>Add Service</strong> → pilih tipe <strong>Database</strong> →
          pilih engine. Platform memilih image resmi, mengalokasikan host port, menyiapkan
          kredensial, dan membuat volume dedicated:
        </p>
        <DocTable
          headers={["Engine", "Image", "Port", "Volume mount"]}
          rows={[
            ["PostgreSQL", "postgres:16-alpine", "5432", "/var/lib/postgresql/data"],
            ["MySQL / MariaDB", "mysql:8 / mariadb:11", "3306", "/var/lib/mysql"],
            ["MongoDB", "mongo:7", "27017", "/data/db"],
            ["Redis", "redis:7-alpine", "6379", "/data"],
          ]}
        />
      </DocSection>

      <DocSection title="Koneksi dari aplikasi Anda">
        <p>
          Service app di project yang sama otomatis menerima env koneksi (lihat{" "}
          <InlineCode>/docs/environment</InlineCode>). Contoh pola di berbagai stack:
        </p>
        <CodeBlock
          language="javascript"
          title="Node (pg client)"
          code={`import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });`}
        />
        <CodeBlock
          language="go"
          title="Go (database/sql + pq)"
          code={`db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))`}
        />
        <CodeBlock
          language="python"
          title="Python (SQLAlchemy)"
          code={`engine = create_engine(os.environ["DATABASE_URL"])`}
        />
        <Callout type="tip" title="Redis / Mongo">
          Gunakan <code>redis://&lt;REDIS_HOST&gt;:&lt;REDIS_PORT&gt;</code> dan{" "}
          <code>MONGODB_URI</code> bila driver Anda meminta URL tunggal.
        </Callout>
      </DocSection>

      <DocSection title="Query database dari platform">
        <p>
          Setiap service database punya tab <strong>Database Manager</strong>: browse table,
          jalankan SELECT, insert/update/delete row, bahkan create/drop table — semuanya dieksekusi
          via engine, tanpa perlu client DB di luar.
        </p>
        <CodeBlock
          language="bash"
          title="Via API"
          code={`curl -X POST https://spaces.kotacloud.com/api/v1/services/$DB_SERVICE_ID/database/query \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"db_type":"postgres","database":"<db_name>","username":"<user>","password":"<pass>","query":"SELECT count(*) FROM users;"}'`}
        />
      </DocSection>

      <DocSection title="Persistensi & redeploy">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Setiap service database memakai volume dedicated yang bertahan antar redeploy.</li>
          <li>Sistem <em>tidak</em> menghapus volume saat delete service — hapus manual bila ingin benar-benar bersih.</li>
          <li>Restore / dump manual dapat dilakukan via <InlineCode>docker exec</InlineCode>&nbsp; dari tab logs (admin) atau API query.</li>
        </ul>
      </DocSection>

      <DocSection title="Skala & limit">
        <p>
          Memory &amp; vCPU database mengikuti plan Anda sama seperti service app. Min 256 MB
          disarankan untuk Postgres berproduksi; otomatis diset saat provisioning.
        </p>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/resources", label: "Resource & Plan" }}
        next={{ href: "/docs/custom-domains", label: "Custom Domain" }}
      />
    </article>
  );
}
