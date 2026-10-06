import { User } from "@/types/auth";

const TOKEN_KEY = "kospaces_jwt_token";
const USER_KEY = "kospaces_current_user";
const SESSION_COOKIE = "kospaces_session";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=604800; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function removeStoredUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function clearAuthStorage(): void {
  removeStoredToken();
  removeStoredUser();
  if (typeof window !== "undefined") {
    try {
      document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      localStorage.removeItem("kospaces_github_auth");
      localStorage.removeItem("kospaces_gitlab_auth");
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("kospaces_github_auth") || key.startsWith("kospaces_gitlab_auth"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}
