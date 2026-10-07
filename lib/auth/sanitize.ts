// Utilitas escaping untuk halaman HTML yang dirender route callback OAuth
// (temuan K-2 laporan audit). Semua nilai yang berasal dari query string
// provider atau respons backend WAJIB melewati fungsi ini sebelum disisipkan
// ke HTML atau ke string JavaScript di dalam <script>.

/** Escape untuk konteks teks & atribut HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape untuk nilai yang disisipkan sebagai string literal JavaScript di
 * dalam <script> — termasuk mengubah `<` menjadi \u003c agar urutan
 * `</script>` tidak dapat memutus tag script.
 */
export function escapeJs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Serialisasi JSON yang aman disematkan langsung di dalam <script>
 * (`</script>`, `<!--`, dan karakter line-separator di-escape).
 */
export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Hanya izinkan path relatif internal sebagai target redirect — tolak
 * `//host` (protocol-relative) dan skema absolut apa pun.
 */
export function safeInternalPath(value: string, fallback = "/workspace/projects"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
