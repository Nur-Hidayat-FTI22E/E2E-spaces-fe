import type { Metadata } from "next";
import {
  DocPageHeader,
  DocSection,
  Callout,
  PreviousNext,
  InlineCode,
  DocTable,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Audit Port 10001–20000 — KotaCloud Spaces Docs",
  description: "Memahami halaman Port Audit admin: status port host, klasifikasi occupied/foreign/free, dan sinkron engine-backend.",
};

export default function PortAuditPage() {
  return (
    <article>
      <DocPageHeader
        title="Audit Port 10001–20000"
        description="Halaman admin untuk memetakan seluruh host port yang dialokasikan platform — gabungan DB, container live, dan probe port host."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Audit Port" }]}
      />

      <DocSection title="Akses">
        <p>
          Buka <InlineCode>/workspace/ports</InlineCode>. Menu ini hanya muncul untuk email yang
          tercantum di <InlineCode>ADMIN_EMAIL</InlineCode> (server) dan{" "}
          <InlineCode>NEXT_PUBLIC_ADMIN_EMAIL</InlineCode> (frontend). Endpoint backend-nya{" "}
          <InlineCode>GET /api/v1/admin/ports</InlineCode> memverifikasi email dari JWT — tanpa
          konfigurasi <InlineCode>ADMIN_EMAIL</InlineCode>, seluruh akses ditolak <code>403</code>.
        </p>
      </DocSection>

      <DocSection title="Klasifikasi status port">
        <DocTable
          headers={["State", "Arti", "Sumber informasi"]}
          rows={[
            ["occupied", "Dipakai service/deployment aktif di DB", "Tabel services + deployments, JOIN users/projects"],
            ["foreign", "Port live atau container berjalan tapi tidak ada di DB", "docker bindings dari engine + probe host"],
            ["free", "Tidak dipakai siapa pun", "Probe bind port host"],
          ]}
        />
        <Callout type="info" title="Filter disediakan">
          Query <code>?filter=occupied|free|foreign|all</code> mengembalikan subset yang sesuai;
          default <code>all</code> menampilkan semuanya.
        </Callout>
      </DocSection>

      <DocSection title="Kolom pada tabel detail">
        <DocTable
          headers={["Kolom", "Isi"]}
          rows={[
            ["Port", "Nomor port host (10001–20000)"],
            ["Owner type", "service | deployment | container | system"],
            ["Owner", "Nama service/deployment (atau nama container asing)"],
            ["User", "Email user pemilik"],
            ["Subdomain", "Label domain service terkait"],
            ["Container", "Status live (RUNNING/EXITED/...) dari engine"],
          ]}
        />
      </DocSection>

      <DocSection title="Kapan fitur ini berguna">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Menemukan <strong>port leaked</strong> (container hidup tapi service sudah dihapus DB).</li>
          <li>Melihat konflik alokasi — mis. port dicadangkan di DB tapi tidak hidup di host.</li>
          <li>Memverifikasi perubahan <InlineCode>PORT_SHIFT</InlineCode> saat engine auto-geser port yang bentrok.</li>
          <li>Memantau kapasitas port (10000 slot) sebelum habis.</li>
        </ul>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/webhooks", label: "Webhooks" }}
      />
    </article>
  );
}
