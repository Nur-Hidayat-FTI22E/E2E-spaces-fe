export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  auth_provider?: string;
  github_username?: string;
  plan?: string;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<User>;
  sendOtp: (email: string) => Promise<{ success: boolean; mode?: string; devCode?: string }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  // loginWithEmail dihapus (K-1 audit) — login email hanya via OTP.
  setSession: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}
