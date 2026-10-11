import { ApiResponse, ApiError } from "@/types/api";
import { getStoredToken, clearAuthStorage } from "@/lib/auth/token";

// NEXT_PUBLIC_API_URL harus ter-inline saat build (NEXT_PUBLIC_* dibaca saat
// compile-time). Bila build berjalan tanpa env tersebut (mis. builder yang
// tidak meneruskan env service ke tahap npm run build), fallback ke origin
// yang sama — /api/v1 diproxy ingress di domain utama sehingga same-origin.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api/v1`
    : "http://127.0.0.1:8082/api/v1");

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuth = false, headers: customHeaders, ...fetchOptions } = options;

  // Build full URL with query parameters
  const url = new URL(
    endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Setup headers
  const headers: Record<string, string> = {};

  // If not sending FormData, set JSON content type
  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Inject Authorization Bearer token unless skipAuth is requested
  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Merge custom headers
  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((val, key) => {
        headers[key] = val;
      });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, val]) => {
        headers[key] = val;
      });
    } else {
      Object.assign(headers, customHeaders);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError(
      `Unable to connect to KotaCloud Spaces API: ${message}`,
      "NETWORK_ERROR",
      0
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  // Parse JSON response
  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError(
        `HTTP Error ${response.status}: ${response.statusText}`,
        "HTTP_ERROR",
        response.status
      );
    }
    return {} as T;
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    clearAuthStorage();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?session_expired=true");
    }
    throw new ApiError(
      json.error?.message || "Session expired. Please sign in again.",
      json.error?.code || "UNAUTHORIZED",
      401
    );
  }

  // Handle unsuccessful responses according to backend contract
  if (!response.ok || !json.success) {
    const errorCode = json.error?.code || `HTTP_${response.status}`;
    const errorMessage = json.error?.message || response.statusText || "Request failed";
    throw new ApiError(errorMessage, errorCode, response.status);
  }

  // Backend contract returns data inside `json.data`
  return json.data;
}
