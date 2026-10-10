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
  title: "Billing & Plan — KotaCloud Spaces Docs",
  description: "Plan langganan, siklus tagihan, invoice, simulasi pembayaran (sandbox), dan reconcile resource.",
};

export default function BillingPage() {
  return (
    <article>
      <DocPageHeader
        title="Billing & Plan"
        description="Plan menentukan kuota service, RAM, vCPU, dan durasi tagihan — dikelola via halaman Billing workspace dan integrasi Midtrans."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Billing & Plan" }]}
      />

      <DocSection title="Plan yang tersedia">
        <DocTable
          headers={["Plan", "Service aktif", "RAM / service", "vCPU / service", "Siklus"]}
          rows={[
            ["Starter", "1", "512 MB", "0.25", "bulanan"],
            ["Professional", "5", "2 GB", "1", "bulanan"],
            ["Business", "20", "8 GB", "4", "bulanan"],
          ]}
        />
        <p>
          Upgrade dari halaman <strong>Billing</strong>; praktis seluruh kuota (service baru,
          resource lebih besar) aktif segera. Downgrade akan di-clamp oleh reconciler pada siklus
          berikutnya tanpa menonaktifkan service.
        </p>
      </DocSection>

      <DocSection title="Siklus tagihan & invoice">
        <p>
          Setiap penyewa punya siklus bulanan dengan invoice otomatis berisi usage plan. Status
          invoice: <code>PENDING</code> → <code>PAID</code> / <code>EXPIRED</code>. Checkout dan
          payment notification dicatat di halaman Billing.
        </p>
      </DocSection>

      <DocSection title="Pembayaran (Midtrans)">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Produksi menggunakan Midtrans Snap (kartu, e-wallet, qris, virtual account).</li>
          <li>Callback ke <InlineCode>POST /api/v1/webhooks/payments/midtrans</InlineCode> yang diverifikasi signature.</li>
          <li>Mode sand-box otomatis aktif bila <InlineCode>MIDTRANS_SERVER_KEY</InlineCode> tidak diset di lingkungan non-produksi.</li>
        </ul>
      </DocSection>

      <Callout type="info" title="Simulation mode (dev)">
        Saat kredensial Midtrans belum diisi, checkout mengembalikan URL simulasi agar seluruh
        alur (checkout → webhook → invoice PAID) bisa diuji tanpa akun Midtrans.
      </Callout>

      <DocSection title="Kapan resource saya berubah?">
        <p>
          Reconciler berjalan tiap 10 menit membandingkan plan terhadap container live. Upgrade
          → batas container dinaikkan otomatis; downgrade → container yang melebihi di-clamp.
          Perubahan permanen memakai <InlineCode>docker update</InlineCode> tanpa restart.
        </p>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/logs", label: "Log Deployment" }}
        next={{ href: "/docs/api", label: "REST API" }}
      />
    </article>
  );
}
