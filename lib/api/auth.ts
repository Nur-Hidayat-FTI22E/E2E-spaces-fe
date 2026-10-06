import { apiClient } from "@/lib/api/client";
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
} from "@/types/auth";

export async function loginApi(data: LoginRequest): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuth: true,
  });
}

export async function registerApi(data: RegisterRequest): Promise<User> {
  return apiClient<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuth: true,
  });
}

export async function getMeApi(): Promise<User> {
  return apiClient<User>("/auth/me", {
    method: "GET",
  });
}

export interface OAuthConfig {
  github_client_id: string;
  github_app_client_id?: string;
  github_app_slug?: string;
  google_client_id: string;
  gitlab_client_id?: string;
}

export async function getOAuthConfigApi(): Promise<OAuthConfig> {
  return apiClient<OAuthConfig>("/auth/config", {
    method: "GET",
    skipAuth: true,
  });
}

export interface UpdateProfileRequest {
  name?: string;
  avatar_url?: string;
}

export async function updateProfileApi(data: UpdateProfileRequest): Promise<User> {
  return apiClient<User>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function uploadAvatarApi(file: File): Promise<User> {
  const formData = new FormData();
  formData.append("avatar", file);
  return apiClient<User>("/auth/avatar", {
    method: "POST",
    body: formData,
  });
}

