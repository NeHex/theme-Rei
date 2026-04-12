export type ProjectApiItem = {
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

const DEFAULT_ISO_DATE = "1970-01-01T00:00:00.000Z";

export type ProjectViewItem = {
  id: string;
  title: string;
  icon: string;
  summary: string;
  category: string;
  content: string;
  techStack: string[];
  projectUrl: string;
  githubUrl: string;
  updatedAt: string;
};

function normalizeAssetPath(path: string | null | undefined) {
  const value = (path || "").trim();
  if (!value) return "";
  if (value.startsWith("/public/")) return value.slice(7);
  if (value.startsWith("public/")) return `/${value.slice(7)}`;
  if (value.startsWith("./")) return value.slice(1);
  return value;
}

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\r\n/g, "\n").trim();
}

function getSummary(item: ProjectApiItem) {
  const source = normalizeText(item.description) || normalizeText(item.content);
  if (!source) return "暂无项目说明";
  return source.length > 72 ? `${source.slice(0, 72)}...` : source;
}

function parseTechStack(raw: string | null | undefined) {
  const value = normalizeText(raw);
  if (!value) return [] as string[];
  return value
    .split(/[\n,，、;；]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDate(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_ISO_DATE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return DEFAULT_ISO_DATE;
  return parsed.toISOString();
}

export function mapProjectApiItem(item: ProjectApiItem): ProjectViewItem {
  return {
    id: String(item.id),
    title: normalizeText(item.title) || "未命名项目",
    icon: normalizeAssetPath(item.cover) || "/images/coseroom-logo.png",
    summary: getSummary(item),
    category: normalizeText(item.category),
    content: normalizeText(item.content),
    techStack: parseTechStack(item.tech_stack),
    projectUrl: normalizeText(item.project_url),
    githubUrl: normalizeText(item.github_url),
    updatedAt: normalizeDate(item.update_time),
  };
}

export function useProjects() {
  const { data, pending, error, refresh } = useAsyncData<ProjectViewItem[]>(
    "site-projects",
    async () => {
      const response = await $fetch<ProjectApiResponse>("/api/project");
      return (response.data ?? []).map(mapProjectApiItem);
    },
    {
      default: () => [],
      server: true,
      lazy: true,
    },
  );

  const projects = computed(() => data.value ?? []);

  function getProjectById(id: string) {
    return projects.value.find((project) => project.id === id);
  }

  return {
    projects,
    pending,
    error,
    refresh,
    getProjectById,
  };
}
