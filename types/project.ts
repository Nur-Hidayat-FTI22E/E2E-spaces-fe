import { Service, ProjectServiceSummary } from "./service";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  // Ringkasan service dari GET /projects (backend mengirim summary ringkas,
  // bukan Service penuh). Detail lengkap ada di endpoint per-project.
  services?: ProjectServiceSummary[] | Service[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

