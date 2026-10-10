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
  title: "Custom Domain — KotaCloud Spaces Docs",
  description: "Sambungkan domain Anda sendiri ke service KotaCloud Spaces dengan DNS otomatis dan sertifikat Let's Encrypt.",
};

export default function CustomDomainsPage() {
  return (
    <article>
      <DocPageHeader
        title="Custom Domain"
        description="Arahkan domain Anda sendiri ke service KotaCloud Spaces — platform menghasilkan record DNS yang disarankan, memverifikasi, dan menerbitkan LE cert per domain."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Custom Domain" }]}
      />

      <DocSection title="1. Tambahkan domain ke service">
        <p>
          Buka service → <strong>Domains</strong> → <strong>Add Domain</strong>. Masukkan{" "}
          <InlineCode>app.yourdomain.com</InlineCode> (subdomain) atau apex{" "}
          <InlineCode>yourdomain.com</InlineCode>.
        </p>
      </DocSection>

      <DocSection title="2. Setup DNS">
        <p>Platform menampilkan instruksi record yang harus dibuat di penyedia DNS Anda:</p>
        <DocTable
          headers={["Jenis domain", "Record", "Nilai"]}
          rows={[
            ["Subdomain", "CNAME", "cname.spaces2.kotacloud.com"],
            ["Apex (root)", "ALIAS / A", "IP edge platform (tampil di UI)"],
            ["Apex (root)", "AAAA", "IPv6 edge platform (bila tersedia)"],
          ]}
        />
      </DocSection>

      <DocSection title="3. Verifikasi otomatis">
        <p>
          Verifier DNS berjalan di background setiap beberapa menit dan menandai domain sebagai{" "}
          <strong>verified</strong> begitu record terbaca. Routing custom domain baru dipasang ke
          proxy <strong>setelah</strong> terverifikasi — mencegah subdomain takeover dari DNS
          yang menggantung.
        </p>
      </DocSection>

      <DocSection title="4. Sertifikat TLS (Let's Encrypt)">
        <p>
          Untuk domain yang bukan <code>*.kotacloud.com</code>, platform menerbitkan sertifikat{" "}
          <strong>Let&apos;s Encrypt</strong> per domain via certbot webroot otomatis. Sertifikat
          per-domain terpisah dan di-renew berkala.
        </p>
        <Callout type="info" title="Wildcard platform">
          Subdomain <code>*-spaces2.kotacloud.com</code> memakai wildcard cert platform — tanpa
          issuance tambahan, instant HTTPS.
        </Callout>
      </DocSection>

      <DocSection title="Redirect domain lain ke domain utama">
        <p>
          Anda bisa menambahkan domain sebagai <strong>redirect</strong> (mis.{" "}
          <InlineCode>www.</InlineCode> → apex) dengan kode HTTP 301/302/307/308:
        </p>
        <CodeBlock
          language="text"
          code={`app.example.com      → proxy ke service (utama)
www.example.com      → 307 redirect ke app.example.com
old.example.com      → 301 redirect permanen (SEO-friendly)`}
        />
      </DocSection>

      <DocSection title="Mitigasi umum">
        <DocTable
          headers={["Gejala", "Penyebab", "Solusi"]}
          rows={[
            ["Pending terus", "CNAME/A belum propagasi", "Tunggu TTL; cek di DNS provider"],
            ["404 di domain", "Domain belum verified", "Pastikan record betul; tunggu verifier"],
            ["SSL error", "LE issuance gagal", "Cek notifikasi; rate-limit LE 5/minggu/domain"],
            ["Domain terpakai service lain", "Domain duplikat", "Lepas dari service sebelumnya"],
          ]}
        />
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/databases", label: "Database Terkelola" }}
        next={{ href: "/docs/streaming", label: "SSE & Streaming" }}
      />
    </article>
  );
}
