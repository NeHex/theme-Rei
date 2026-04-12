type ProjectApiItem = {
  id: number;
  title: string;
  cover: string | null;
  category: string | null;
  description: string | null;
  content: string | null;
  tech_stack: string | null;
  project_url: string | null;
  github_url: string | null;
  sort: number;
  status: number;
  create_time: string;
  update_time: string;
};

type ProjectApiResponse = {
  data: ProjectApiItem[];
};

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await backendFetch<ProjectApiResponse>("/project", { method: "GET" });
  } catch (error) {
    logBackendFallback("project-api", error);
    return { data: [] as ProjectApiItem[] };
  }
});
