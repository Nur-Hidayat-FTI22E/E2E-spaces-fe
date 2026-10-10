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
  title: "SSE & Streaming — KotaCloud Spaces Docs",
  description: "Cara platform memperlakukan Server-Sent Events, WebSocket, dan respons streaming di ingress.",
};

export default function StreamingPage() {
  return (
    <article>
      <DocPageHeader
        title="SSE & Streaming"
        description="Server-Sent Events, WebSocket upgrade, dan respons berdurasi panjang didukung penuh di ingress KotaCloud — tanpa konfigurasi tambahan."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "SSE & Streaming" }]}
      />

      <DocSection title="Apa yang sudah dikonfigurasi">
        <p>Setiap vhost service (subdomain maupun custom domain) memakai:</p>
        <CodeBlock
          language="nginx"
          title="Directive yang diaplikasikan engine pada tiap location /"
          code={`proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';   # websocket upgrade passthrough
proxy_set_header Host $host;

proxy_buffering off;                     # streaming tidak dibuffer
proxy_read_timeout 3600s;                # 1 jam idling tidak diputus
proxy_send_timeout 3600s;`}
        />
        <Callout type="info" title="Ditambah di host bridge">
          Bridge nginx (wildcard <code>*.kotacloud.com</code> → ingress) juga memakai{" "}
          <code>proxy_buffering off</code> + timeout 1 jam sehingga stream dari Cloudflare ke
          origin tidak ter-buffer di hop manapun.
        </Callout>
      </DocSection>

      <DocSection title="Pola Server-Sent Events">
        <CodeBlock
          language="go"
          title="Backend Go — SSE handler"
          code={`func handleSSE(w http.ResponseWriter, r *http.Request) {
  fl := w.(http.Flusher)
  w.Header().Set("Content-Type", "text/event-stream")
  w.Header().Set("Cache-Control", "no-cache")
  tick := time.NewTicker(15 * time.Second)
  defer tick.Stop()
  for {
    select {
    case <-r.Context().Done():
      return
    case <-tick.C:
      fmt.Fprint(w, ": keepalive\\n\\n")
      fl.Flush()
    }
  }
}`}
        />
        <CodeBlock
          language="javascript"
          title="Browser — EventSource"
          code={`const es = new EventSource("/api/stream");
es.onmessage = (e) => console.log("event:", e.data);`}
        />
        <Callout type="tip" title="Kirim keepalive < 25 detik">
          Beberapa CDN menutup idle stream lebih awal; kirim keepalive (mis. ": keepalive") tiap
          10–15 detik agar koneksi tetap hidup sepanjang proxy chain.
        </Callout>
      </DocSection>

      <DocSection title="Pola-trauma yang sudah diatasi">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>EventSource lama &quot;menghubungkan…&quot; selamanya — disebabkan nginx hop yang dibuffer; kini <strong>off</strong> di seluruh hop.</li>
          <li>WS disconnect saat idle 60s — timeout di-naikkan ke 1 jam.</li>
          <li>Cloudflare-to-origin buffering — bridge hop bawah mematikan buffering juga.</li>
        </ul>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/custom-domains", label: "Custom Domain" }}
        next={{ href: "/docs/logs", label: "Log Deployment" }}
      />
    </article>
  );
}
