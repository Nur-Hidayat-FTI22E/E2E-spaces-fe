/**
 * Strips embedded credentials or access tokens from a repository URL.
 * e.g., https://x-access-token:gho_xxx@github.com/user/repo.git -> https://github.com/user/repo.git
 */
export function cleanRepoUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  return rawUrl.trim().replace(/^(https?:\/\/)[^@/]+@/, "$1");
}

/**
 * Returns a clean, human-readable repository name for display.
 * e.g., https://x-access-token:gho_xxx@github.com/syrramadhan/deployments.git -> syrramadhan/deployments
 */
export function getRepoDisplayName(rawUrl?: string): string {
  if (!rawUrl) return "";
  const cleaned = cleanRepoUrl(rawUrl);
  return cleaned
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^https?:\/\/(www\.)?gitlab\.com\//i, "")
    .replace(/^git@[^:]+:/i, "")
    .replace(/\.git$/i, "");
}

/**
 * Parses owner and repo name from GitHub URL.
 */
export function getGitHubRepoParts(rawUrl?: string): { owner: string; repo: string } | null {
  if (!rawUrl) return null;
  const clean = cleanRepoUrl(rawUrl).replace(/\.git$/i, "").trim();
  const match = clean.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  const plainMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (plainMatch) {
    return { owner: plainMatch[1], repo: plainMatch[2] };
  }
  return null;
}

/**
 * Retrieves the GitHub token from URL or local storage.
 */
export function getAvailableGithubToken(rawUrl?: string): string | null {
  if (rawUrl) {
    const embeddedMatch = rawUrl.match(/^https?:\/\/(?:[^:]+:)?([^@/:]+)@/i);
    if (embeddedMatch && embeddedMatch[1] && !embeddedMatch[1].includes("/")) {
      return embeddedMatch[1];
    }
  }

  if (typeof window !== "undefined") {
    try {
      const userRaw = localStorage.getItem("kospaces_current_user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user?.id) {
          const userKey = `kospaces_github_auth_${user.id}`;
          const savedUserAuth = localStorage.getItem(userKey);
          if (savedUserAuth) {
            const parsed = JSON.parse(savedUserAuth);
            if (parsed?.token) return parsed.token;
          }
        }
      }

      const savedAuth = localStorage.getItem("kospaces_github_auth");
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.token) return parsed.token;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export interface CommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  authorName?: string;
  date?: string;
  url?: string;
}

const commitCache = new Map<string, { info: CommitInfo | null; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetches the latest commit information from the GitHub repository.
 */
export async function fetchLatestCommit(
  repoUrl?: string,
  branch?: string
): Promise<CommitInfo | null> {
  if (!repoUrl) return null;
  const parts = getGitHubRepoParts(repoUrl);
  if (!parts) return null;

  const cacheKey = `${parts.owner}/${parts.repo}:${branch || "default"}`;
  const cached = commitCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.info;
  }

  const token = getAvailableGithubToken(repoUrl);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const targetBranch = branch?.trim() || "main";
  try {
    let res = await fetch(
      `https://api.github.com/repos/${parts.owner}/${parts.repo}/commits/${encodeURIComponent(targetBranch)}`,
      { headers }
    );

    if (!res.ok) {
      res = await fetch(
        `https://api.github.com/repos/${parts.owner}/${parts.repo}/commits?per_page=1`,
        { headers }
      );
    }

    if (!res.ok) {
      commitCache.set(cacheKey, { info: null, timestamp: Date.now() });
      return null;
    }

    const data = await res.json();
    const commitObj = Array.isArray(data) ? data[0] : data;
    if (!commitObj || !commitObj.sha) {
      commitCache.set(cacheKey, { info: null, timestamp: Date.now() });
      return null;
    }

    const info: CommitInfo = {
      sha: commitObj.sha,
      shortSha: commitObj.sha.slice(0, 7),
      message: commitObj.commit?.message?.split("\n")[0] || "Update repository",
      authorName: commitObj.commit?.author?.name || commitObj.author?.login,
      date: commitObj.commit?.author?.date,
      url: commitObj.html_url || `https://github.com/${parts.owner}/${parts.repo}/commit/${commitObj.sha}`,
    };

    commitCache.set(cacheKey, { info, timestamp: Date.now() });
    return info;
  } catch {
    return null;
  }
}

const branchesCache = new Map<string, { branches: string[]; timestamp: number }>();

/**
 * Fetches all branch names for a given Git repository URL (GitHub & GitLab supported).
 */
export async function fetchRepoBranches(repoUrl?: string): Promise<string[]> {
  if (!repoUrl) return [];
  const cleanedUrl = cleanRepoUrl(repoUrl);

  const ghParts = getGitHubRepoParts(repoUrl);
  if (ghParts) {
    const cacheKey = `gh:${ghParts.owner}/${ghParts.repo}`;
    const cached = branchesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.branches;
    }

    const token = getAvailableGithubToken(repoUrl);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${ghParts.owner}/${ghParts.repo}/branches?per_page=100`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const branches = data.map((b: { name: string }) => b.name);
          branchesCache.set(cacheKey, { branches, timestamp: Date.now() });
          return branches;
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  // Check GitLab
  if (cleanedUrl.includes("gitlab.com")) {
    const glMatch = cleanedUrl.match(/gitlab\.com\/([^/]+)\/([^/?#]+)/i);
    if (glMatch) {
      const projectPath = encodeURIComponent(`${glMatch[1]}/${glMatch[2].replace(/\.git$/i, "")}`);
      const cacheKey = `gl:${projectPath}`;
      const cached = branchesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.branches;
      }

      try {
        const res = await fetch(
          `https://gitlab.com/api/v4/projects/${projectPath}/repository/branches?per_page=100`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const branches = data.map((b: { name: string }) => b.name);
            branchesCache.set(cacheKey, { branches, timestamp: Date.now() });
            return branches;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return [];
}

