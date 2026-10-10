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
  title: "REST API — KotaCloud Spaces Docs",
  description: "Seluruh operasional platform terekspos via REST API di /api/v1 dengan Bearer token.",
};

export default function ApiPage() {
  return (
    <article>
      <DocPageHeader
        title="REST API"
        description="Base URL: https://spaces.kotacloud.com/api/v1 — autentikasi via JWT Bearer token dari login/OAuth. Semua respon memakai format { success, data | error }."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "REST API" }]}
        />

      <DocSection title="Autentikasi">
        <CodeBlock
          language="bash"
          title="Login (email)"
          code={`curl -X POST https://spaces.kotacloud.com/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"<password>"}'`}
        />
        <CodeBlock
          language="bash"
          title="Pakai token"
          code={`curl https://spaces.kotacloud.com/api/v1/auth/me \\
  -H "Authorization: Bearer <JWT>"`}
        />
        <Callout type="info" title="Token dari OAuth / OTP">
          Alur GitHub/GitLab/Google OAuth dan email OTP mengembalikan <code>{"{ token, user }"} </code> yang
          sama — simpan di penyimpanan aman dan sertakan di header Authorization.
        </Callout>
      </DocSection>

      <DocSection title="Projects & Services">
        <DocTable
          headers={["Endpoint", "Fungsi"]}
          rows={[
            ["POST /projects", "Buat project"],
            ["GET /projects", "List project milik user"],
            ["GET /projects/:id", "Detail project"],
            ["DELETE /projects/:id", "Hapus project (beserta service)"],
            ["POST /projects/:id/services", "Buat service (git/docker/database)"],
            ["GET /projects/:id/services", "List service dalam project"],
            ["GET /services/:id", "Detail service (env, resource, domain)"],
            ["PUT /services/:id", "Update atribut & env"],
            ["DELETE /services/:id", "Delete service (container + conf dihapus)"],
            ["POST /services/:id/deploy", "Trigger deployment baru"],
            ["POST /services/:id/start|stop|restart", "Lifecycle container"],
          ]}
        />
      </DocSection>

      <DocSection title="Deployments & logs">
        <DocTable
          headers={["Endpoint", "Fungsi"]}
          rows={[
            ["POST /projects/:id/deployments/git", "Deployment Git legacy per-project"],
            ["POST /projects/:id/deployments/docker", "Deployment Docker legacy"],
            ["GET /projects/:id/deployments", "History deployments"],
            ["GET /deployments/:id", "Detail deployment"],
            ["GET /deployments/:id/logs", "Build/deploy logs (batch)"],
            ["GET /deployments/:id/container-logs", "Runtime container logs"],
            ["POST /deployments/:id/stop|start|restart", "Lifecycle deployment legacy"],
          ]}
        />
      </DocSection>

      <DocSection title="Domains">
        <DocTable
          headers={["Endpoint", "Fungsi"]}
          rows={[
            ["POST /projects/:id/domains", "Tambah domain (subdomain / custom)"],
            ["GET /projects/:id/domains", "List domain project"],
            ["PUT /domains/:id", "Update redirect / konfigurasi"],
            ["DELETE /domains/:id", "Lepas domain"],
            ["POST /domains/:id/dns/verify", "Trigger verifikasi DNS manual"],
          ]}
        />
      </DocSection>

      <DocSection title="Database management">
        <CodeBlock
          language="http"
          title="Contoh: browse data tabel"
          code={`GET /services/:id/database/overview
GET /services/:id/database/tables/:table/data
POST /services/:id/database/query          ${"{ \"query\": \"SELECT ...\" }"}
POST /services/:id/database/tables/:table/rows
...`}
        />
      </DocSection>

      <DocSection title="System & admin">
        <DocTable
          headers={["Endpoint", "Fungsi"]}
          rows={[
            ["GET /health", "Kesehatan API backend"],
            ["GET /system/engine/health", "Liveness engine (worker count, dsb.)"],
            ["GET /system/engine/health/stream", "SSE stream kesehatan engine"],
            ["GET /admin/ports?filter=occupied", "Audit port host 10001-20000 (ADMIN_EMAIL)"],
          ]}
        />
      </DocSection>

      <DocSection title="Rate limit & skema error">
        <p>
          Endpoint aplikatif dibatasi oleh rate limiter per-user. Error standard:{" "}
          <InlineCode>401 UNAUTHORIZED</InlineCode>, <InlineCode>403 FORBIDDEN</InlineCode>,{" "}
          <InlineCode>404 NOT_FOUND</InlineCode>, <InlineCode>409 CONFLICT</InlineCode>,{" "}
          <InlineCode>429 RATE_LIMITED</InlineCode>, <InlineCode>500 INTERNAL_ERROR</InlineCode>{" "}
          — selalu dengan <InlineCode>error.code</InlineCode> tersruktur.
        </p>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/billing", label: "Billing & Plan" }}
        next={{ href: "/docs/webhooks", label: "Webhooks" }}
      />
    </article>
  );
}
