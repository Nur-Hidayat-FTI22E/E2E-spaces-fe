// State OAuth double-submit cookie untuk mencegah login CSRF (temuan K-2).
//
// Klien memanggil buildOAuthState(purpose) sebelum membuka URL authorize:
//   state = `<purpose>.<random>`  → dikirim ke provider sebagai query `state`
//   cookie `kospaces_oauth_state` = `<random>` (SameSite=Lax, 10 menit)
//
// Route callback memverifikasi via verifyOAuthState(req, state): bagian
// random harus cocok dengan cookie. Purpose dipakai untuk menentukan tujuan
// redirect (mis. "settings" dari halaman settings GitHub App).

export const OAUTH_STATE_COOKIE = "kospaces_oauth_state";
export const OAUTH_STATE_MAX_AGE = 600; // 10 menit

export type OAuthStatePurpose = "login" | "settings" | "link";

/** (Klien) Bangun state acak + simpan bagian random di cookie. */
export function buildOAuthState(purpose: OAuthStatePurpose): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let random = "";
  for (const b of bytes) {
    random += b.toString(16).padStart(2, "0");
  }
  if (typeof document !== "undefined") {
    document.cookie = `${OAUTH_STATE_COOKIE}=${random}; path=/; max-age=${OAUTH_STATE_MAX_AGE}; SameSite=Lax`;
  }
  return `${purpose}.${random}`;
}

export function parseOAuthState(state: string | null | undefined): { purpose: string; random: string } | null {
  if (!state) return null;
  const idx = state.indexOf(".");
  if (idx <= 0 || idx === state.length - 1) return null;
  return { purpose: state.slice(0, idx), random: state.slice(idx + 1) };
}

/** (Server) Bandingkan bagian random state dengan cookie (constant-time). */
export function verifyOAuthState(
  cookieValue: string | undefined,
  state: string | null | undefined
): { ok: boolean; purpose: string } {
  const parsed = parseOAuthState(state);
  if (!cookieValue || !parsed) return { ok: false, purpose: "" };
  const { purpose, random } = parsed;
  if (random.length !== cookieValue.length) return { ok: false, purpose };
  let diff = 0;
  for (let i = 0; i < random.length; i++) {
    diff |= random.charCodeAt(i) ^ cookieValue.charCodeAt(i);
  }
  return { ok: diff === 0, purpose };
}
