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

type ProjectDetailApiResponse = {
  data: ProjectApiItem;
};

import { backendFetch, logBackendFallback } from "../../utils/backendFetch";
import { assertProjectDetailApiResponse } from "../../utils/detailApiContracts";

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, "id");
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing project id",
    });
  }

  try {
    return assertProjectDetailApiResponse(await backendFetch<ProjectDetailApiResponse>(`/project/${projectId}`, {
      method: "GET",
    }));
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 500);
    if (statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found",
      });
    }

    logBackendFallback("project-detail-api", error);
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to load project",
    });
  }
});
