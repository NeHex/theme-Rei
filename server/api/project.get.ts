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

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export default defineEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    "http://127.0.0.1:7878";

  try {
    const response = await $fetch<ProjectApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/project`,
      {
        method: "GET",
        timeout: 12000,
        retry: 1,
        retryDelay: 250,
      },
    );

    return response;
  } catch (error) {
    console.error("[project-api] failed to fetch projects", error);
    return { data: [] as ProjectApiItem[] };
  }
});
