import { toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";

import { mapProjectApiItem } from "~/composables/useProjects";
import type { ProjectApiItem, ProjectViewItem } from "~/composables/useProjects";

type ProjectDetailApiResponse = {
  data: ProjectApiItem;
};

export function useProjectDetail(projectId: MaybeRefOrGetter<string | number>) {
  const id = computed(() => String(toValue(projectId)).trim());

  const { data, pending, error, refresh } = useAsyncData<ProjectViewItem | null>(
    () => `project-detail-${id.value}`,
    async () => {
      if (!id.value) return null;
      const response = await $fetch<ProjectDetailApiResponse>(
        `/api/project/${encodeURIComponent(id.value)}`,
        { cache: "no-store" },
      );
      return mapProjectApiItem(response.data);
    },
    {
      default: () => null,
      server: true,
      lazy: true,
      watch: [id],
    },
  );

  const project = computed(() => data.value);

  return {
    project,
    pending,
    error,
    refresh,
  };
}
