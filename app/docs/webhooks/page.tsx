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
  title: "Webhooks — KotaCloud Spaces Docs",
  description: "Integrasikan push event GitHub dan trigger deploy service via webhook ber-HMAC.",
};

export default function WebhooksPage() {
  return (
    <article>
      <DocPageHeader
        title="Webhooks"
        description="KotaCloud Spaces menyediakan endpoint webhook ber-HMAC untuk mengintegrasikan event external — push GitHub, trigger deploy service, dan callback pembayaran."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Webhooks" }]}
      />

      <DocSection title="1. GitHub push → auto deploy">
        <p>
          Setiap service Git menampilkan <strong>webhook secret</strong> di halaman service.
          Tambahkan webhook di GitHub repo Anda:
        </p>
        <CodeBlock
          language="text"
          title="GitHub repo → Settings → Webhooks"
          code={`Payload URL : https://spaces.kotacloud.com/api/v1/webhooks/github
Content type: application/json
Secret      : <secret dari halaman service>
Events      : Just the push event`}
        />
        <p>
          Platform memverifikasi signature HMAC (X-Hub-Signature-256), memetakan push ke service
          yang mengarah ke repo &amp; branch, lalu menjalankan auto-deploy. Status result{" "}
          <InlineCode>pending/success/failure</InlineCode> dikirim balik ke GitHub commit/PR.
        </p>
      </DocSection>

      <DocSection title="2. Service deploy webhook (trigger manual)">
        <DocTable
          headers={["Endpoint", "Fungsi"]}
          rows={[
            ["POST /webhooks/services/:id/deploy", "Trigger deploy service tertentu (HMAC)"],
            ["POST /webhooks/services/:id/status", "Update status deployment (dipakai engine)"],
            ["POST /webhooks/services/:id/logs", "Push log batch dari engine"],
            ["POST /webhooks/services/:id/logs/batch", "Ambil seluruh log deployment"],
            ["POST /webhooks/deployments/:id/…", "Alias untuk deployment legacy"],
          ]}
        />
        <CodeBlock
          language="bash"
          title="Contoh trigger deploy via curl + HMAC"
          code={`BODY='{"action":"deploy"}'
SIG=$(printf "%s" "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)
curl -X POST https://spaces.kotacloud.com/api/v1/webhooks/services/$SID/deploy \\
  -H "Content-Type: application/json" \\
  -H "X-Signature-256: sha256=$SIG" \\
  -d "$BODY"`}
        />
      </DocSection>

      <DocSection title="3. Callback engine → backend">
        <p>
          Engine memanggil endpoint berikut (diproteksi ENGINE_API_SECRET, bukan HMAC):
        </p>
        <CodeBlock
          language="text"
          code={`POST /api/v1/webhooks/deployments/:id/status   # status update
POST /api/v1/webhooks/deployments/:id/logs     # log streaming batch
POST /api/v1/webhooks/services/:id/…           # alias service ID
POST /api/v1/webhooks/projects/:id/status      # alias project ID`}
        />
      </DocSection>

      <DocSection title="4. Midtrans payment callback">
        <CodeBlock
          language="text"
          code={`POST /api/v1/webhooks/payments/midtrans`}
        />
        <p>
          Diprotected oleh signature verification (Midtrans server key). Invoice status
          diperbarui otomatis dari HTTP notification Midtrans.
        </p>
      </DocSection>

      <Callout type="warning" title="Keamanan webhook">
        Semua endpoint webhook memverifikasi secret — jangan pernah melepas <code>Secret</code>
        GitHub atau <code>ENGINE_API_SECRET</code> di luar konfigurasi resmi. Signature lama
        (X-Hub-Signature) tetap didukung, tapi <strong>256</strong> disarankan.
      </Callout>

      <PreviousNext
        prev={{ href: "/docs/api", label: "REST API" }}
        next={{ href: "/docs/port-audit", label: "Audit Port" }}
      />
    </article>
  );
}
