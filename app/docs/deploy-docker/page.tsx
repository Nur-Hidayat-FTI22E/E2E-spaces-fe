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
  title: "Deploy Docker Image — KotaCloud Spaces Docs",
  description: "Deploy service langsung dari Docker image publik — nginx, redis, database, atau image custom Anda.",
};

export default function DeployDockerPage() {
  return (
    <article>
      <DocPageHeader
        title="Deploy Docker Image"
        description="Untuk stack yang tidak punya repo — image resmi database, gateway, atau image dari registry Anda — gunakan tipe service DOCKER."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Deploy Docker Image" }]}
      />

      <DocSection title="Membuat service Docker">
        <p>
          Isi nama image persis seperti di registry (tag wajib, hindari <code>latest</code> untuk
          reproducibility):
        </p>
        <CodeBlock
          language="text"
          title="Contoh image"
          code={`nginx:alpine
redis:7-alpine
postgres:16-alpine
traefik/whoami:v1.10
ghcr.io/org/app:1.2.3`}
        />
        <Callout type="info" title="Image database punya perlakuan khusus">
          Postgres/MySQL/MariaDB/MongoDB/Redis otomatis mendapat: volume persisten khusus
          (<InlineCode>kospaces-vol-&lt;container&gt;</InlineCode>), kapabilitas CHOWN/SETUID
          minimal agar entrypoint resmi bisa setuid ke user service, dan env koneksi
          (<InlineCode>DATABASE_URL</InlineCode>, <InlineCode>REDIS_URL</InlineCode>) yang
          disiapkan untuk service app Anda.
        </Callout>
      </DocSection>

      <DocSection title="Hardening container">
        <p>Setiap container tenant menjalankan profile keamanan bawaan platform:</p>
        <DocTable
          headers={["Flag", "Nilai"]}
          rows={[
            ["cap-drop", "Semua dangerous caps dibuang (daftar 30) — cap bawaan Docker dibatasi"],
            ["cap-add (DB/nginx)", "CHOWN, SETUID, SETGID, DAC_OVERRIDE, FOWNER untuk entrypoint resmi"],
            ["security-opt", "no-new-privileges:true (tidak bisa eskalasi dari di dalam)"],
            ["pids-limit", "512 proses maksimum"],
            ["publish", "127.0.0.1:host_port + 172.17.0.1:host_port (lokal & bridge)"],
          ]}
        />
        <Callout type="warning" title="Bukan root di aplikasi Anda">
          Pastikan image Anda tidak butuh <code>--privileged</code>. Image yang chown direktori
          runtime saat start (nginx, postgres) otomatis mendapat cap yang diperlukan.
        </Callout>
      </DocSection>

      <DocSection title="Redeploy & persistensi data">
        <p>
          Redeploy service DOCKER memublik port yang sama (konsistensi URL, conf, dan env) dan
          meregenerasi konfigurasi ingress. Untuk image database, volume{" "}
          <InlineCode>kospaces-vol-&lt;nama-container&gt;</InlineCode> persistent antar redeploy;
          data tidak hilang kecuali volume dihapus manual.
        </p>
      </DocSection>

      <DocSection title="Contoh end-to-end (nginx)">
        <CodeBlock
          language="bash"
          title="Via API (script / CLI Anda)"
          code={`# 1. Buat service
curl -X POST $API/v1/projects/$PID/services \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"gateway","source_type":"docker","docker_image":"nginx:alpine","container_port":80,"subdomain":"gateway-saya"}'

# 2. Trigger deploy
curl -X POST $API/v1/services/$SID/deploy -H "Authorization: Bearer $TOKEN"

# 3. Poll status hingga RUNNING
curl $API/v1/services/$SID -H "Authorization: Bearer $TOKEN"`}
        />
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/deploy-git", label: "Deploy dari Git" }}
        next={{ href: "/docs/environment", label: "Environment Variables" }}
      />
    </article>
  );
}
