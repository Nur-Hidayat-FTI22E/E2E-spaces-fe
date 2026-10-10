import type { Metadata } from "next";
import {
  DocPageHeader,
  DocSection,
  Callout,
  PreviousNext,
  InlineCode,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "Log Deployment — KotaCloud Spaces Docs",
  description: "Streaming build log real-time, runtime container logs, dan cara mendiagnosis deploy gagal.",
};

export default function LogsPage() {
  return (
    <article>
      <DocPageHeader
        title="Log Deployment"
        description="Dua jenis log tersedia: build/deploy log (streaming real-time saat proses) dan container runtime log yang terus meniru keluaran aplikasi."
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Log Deployment" }]}
      />

      <DocSection title="Build & deploy log">
        <p>
          Saat Anda men-trigger deploy, tab <strong>Logs</strong> menampilkan stream real-time —
          per fase (<code>build</code> lalu <code>deploy</code>), warna status (INFO/WARN/ERROR),
          dan progress bar docker/git.

        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Pesan <code>{"==> Stopping old container..."}</code> menandakan fase swap mulai.</li>
          <li>Crash pasca start menampilkan <code>[ERROR] Application container failed to run</code> + 25 baris akhir</li>
          <li>Deploy sukses: <code>Deploy complete</code> (hijau) + durasi build.</li>
        </ul>
      </DocSection>

      <DocSection title="Runtime container logs">
        <p>
          Setelah deployment <strong>RUNNING</strong>, tab log beralih ke stream{" "}
          <InlineCode>docker logs</InlineCode> container — keluaran aplikasi Anda (stdout/stderr)
          ditampilkan dengan timestamp, tail 200 baris default polling 3 detik.
        </p>
        <Callout type="info" title="Struktur log disarankan">
          Tulis log aplikasi dengan level yang jelas (<code>INFO</code>/<code>ERROR</code>) —
          platform menandai baris yang mengandung <code>error</code>/<code>fatal</code>{" "}
          berwarna merah agar lebih mudah dipindai.
        </Callout>
      </DocSection>

      <DocSection title="Mendiagnosis kegagalan umum">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Build FAILED</strong>: perhatikan baris ERROR terakhir di build log; cek dependency mismatch, versi Node/Go yang hilang.</li>
          <li><strong>Deploy FAILED, container exited</strong>: buka log 25 baris terakhir — biasanya env tersalah port salah; perbaiki lalu redeploy.</li>
          <li><strong>App RUNNING tapi 502</strong>: cek <code>PORT</code> / <code>container_port</code> cocok dengan aplikasi Anda.</li>
          <li><strong>Database connection refused</strong>: pastikan membaca <InlineCode>DATABASE_URL</InlineCode> (bukan localhost) — lihat{" "}<InlineCode>/docs/environment</InlineCode>.</li>
        </ul>
      </DocSection>

      <DocSection title="Riwayat deployment">
        <p>
          Riwayat semua deployment tersimpan di halaman service (terbaru di atas), lengkap dengan
          commit SHA, branch, durasi, dan status. Deployment lebih dari 3 yang lama di-purge dari
          database secara otomatis.
        </p>
      </DocSection>

      <PreviousNext
        prev={{ href: "/docs/streaming", label: "SSE & Streaming" }}
        next={{ href: "/docs/billing", label: "Billing & Plan" }}
      />
    </article>
  );
}
