import type { Metadata } from "next";
import Link from "next/link";
import {
  DocPageHeader,
  DocSection,
  Callout,
  PreviousNext,
  InlineCode,
  DocTable,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Resource & Plan — KotaCloud Spaces Docs",
  description: "Kuota memory & vCPU per service, semantik plan max, clamp host, dan perilaku upgrade/downgrade plan.",
};

export default function ResourcesPage() {
  return (
    <article>
      <DocPageHeader
        title="Resource & Plan"
        description="KotaCloud Spaces membatasi resource per-service sesuai paket, dengan clamp otomatis agar nilai sel valid di host fisik."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Resource & Plan" }]}
      />

      <DocSection title="Semantik batas (plan max)">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Saat service dibuat <strong>tanpa</strong> request explicit → diisi nilai <strong>plan max</strong>.</li>
          <li>Sisa mee tukkan custom nilai lebih tinggi dari plan max → di-<em>clamp</em> ke <strong>plan max</strong>.</li>
          <li>Reconciler berkala memastikan container yang berjalan tidak melebihi plan max (mis. setelah downgrade).</li>
          <li>Semua limit diterapkan via <InlineCode>docker update</InlineCode> — tanpa restart container.</li>
        </ul>
      </DocSection>

      <DocSection title="Plan & kuota default">
        <DocTable
          headers={["Plan", "RAM / Service", "vCPU / Service", "Service aktif"]}
          rows={[
            ["Starter", "512 MB", "0.25 vCPU", "1"],
            ["Professional", "2 GB", "1 vCPU", "5"],
            ["Business", "8 GB", "4 vCPU", "20"],
          ]}
        />
        <Callout type="info" title="Clamp ke host fisik">
          Nilai plan max di-<em>clamp</em> lagi ke kapasitas host yang menjalankan engine: RAM
          total dikurangi 512 MB headroom, dan vCPU maksimum mengikuti jumlah core fisik host.
          Jadi nilai plan melebihi host tetap bisa deploy — hanya melebihi kapasitas yang tidak.
        </Callout>
      </DocSection>

      <DocSection title="Memilih nilai sendiri">
        <p>
          Saat membuat service biarkan kosong untuk auto plan-max, atau isi angka lebih rendah
          untuk hemat (mis. worker yang ringan 128 MB). Nilai dapat diubah kapan pun dari halaman
          service → <strong>Resources</strong>.
        </p>
      </DocSection>

      <DocSection title="Upgrade plan">
        <p>
          Saat Anda upgrade plan via <Link href="/workspace/billing" className="text-cyan-300 hover:underline">Billing</Link>,
          reconciler otomatis naikkan batas container yang berjalan ke kuota plan baru dalam
          menit — tanpa downtime. Downgrade sebaliknya: container yang melebihi kuota di-clamp
          turun.
        </p>
      </DocSection>

      <DocSection title="Port allocation">
        <p>
          Setiap service menerima satu <strong>host port unik</strong> dari range{" "}
          <InlineCode>10001–20000</InlineCode>. Port dipertahankan antar redeploy untuk
          konsistensi. Bila port bentrok eksternal (rare), engine auto-geser dan menyinkronkan
          backend. Audit seluruh range tersedia untuk admin via{" "}
          <InlineCode>/workspace/ports</InlineCode>.
        </p>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/environment", label: "Environment Variables" }}
        next={{ href: "/docs/databases", label: "Database Terkelola" }}
      />
    </article>
  );
}
