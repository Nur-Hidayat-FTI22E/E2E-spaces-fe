// Konstanta domain platform yang dapat dikonfigurasi per environment.
//
// NEXT_PUBLIC_PLATFORM_URL_SUFFIX digabung ke subdomain polos untuk
// membentuk hostname publik service, mis. suffix "-spaces.kotacloud.com"
// menghasilkan "myapp-spaces.kotacloud.com".
// Untuk zona test milik sendiri (domain tidak dimiliki), gunakan TLD
// khusus testing seperti "-spaces.kotacloud.test" (RFC 2606).
export const PLATFORM_URL_SUFFIX =
  process.env.NEXT_PUBLIC_PLATFORM_URL_SUFFIX || "-spaces.kotacloud.com";

// Target CNAME yang disarankan untuk custom domain (harus sinkron dengan
// DOMAINS_CNAME_TARGET di backend).
export const PLATFORM_CNAME_TARGET =
  process.env.NEXT_PUBLIC_PLATFORM_CNAME_TARGET || "cname.spaces.kotacloud.com";

// Subdomain yang sudah mengandung titik dianggap custom domain utuh.
export function isCustomDomainName(subdomain: string | undefined | null): boolean {
  return Boolean(subdomain && subdomain.includes("."));
}

// Hostname lengkap untuk sebuah subdomain service.
export function platformServiceHost(subdomain: string | undefined | null): string {
  if (!subdomain) return "";
  return isCustomDomainName(subdomain) ? subdomain : `${subdomain}${PLATFORM_URL_SUFFIX}`;
}

// URL publik https untuk sebuah subdomain service.
export function platformServiceUrl(subdomain: string | undefined | null): string {
  const host = platformServiceHost(subdomain);
  return host ? `https://${host}` : "";
}
