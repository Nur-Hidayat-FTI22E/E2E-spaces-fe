"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthContextType,
} from "@/types/auth";
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearAuthStorage,
} from "@/lib/auth/token";
import { loginApi, registerApi, getMeApi } from "@/lib/api/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify authentication state on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(storedUser);
        }

        // Verify token with backend
        try {
          const freshUser = await getMeApi();
          setUser(freshUser);
          setStoredUser(freshUser);
        } catch {
          // Token is expired or invalid
          clearAuthStorage();
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (req: LoginRequest) => {
      setIsLoading(true);
      try {
        const res = await loginApi(req);
        setStoredToken(res.token);
        setStoredUser(res.user);
        setToken(res.token);
        setUser(res.user);
        router.push("/workspace/projects");
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const register = useCallback(async (req: RegisterRequest) => {
    setIsLoading(true);
    try {
      const newUser = await registerApi(req);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSession = useCallback((newToken: string, newUser: User) => {
    setStoredToken(newToken);
    setStoredUser(newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      return {
        success: true,
        mode: data.mode,
        devCode: data.devCode,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Invalid verification code.");
        }

        setStoredToken(data.token);
        setStoredUser(data.user);
        setToken(data.token);
        setUser(data.user);
        router.push("/workspace/projects");
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const loginWithEmail = useCallback(
    async (email: string) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to authenticate email");
        }

        setStoredToken(data.token);
        setStoredUser(data.user);
        setToken(data.token);
        setUser(data.user);
        router.push("/workspace/projects");
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await getMeApi();
      setUser(freshUser);
      setStoredUser(freshUser);
    } catch {
      logout();
    }
  }, [logout]);

  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);
    setStoredUser(newUser);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    sendOtp,
    verifyOtp,
    loginWithEmail,
    setSession,
    logout,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
