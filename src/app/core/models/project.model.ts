export interface Project {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  topics: string[];
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

export interface ProjectsConfig {
  github_user: string;
  featured: string[];
  excluded: string[];
}
