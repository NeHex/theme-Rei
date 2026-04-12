import { toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";

import { mapArticleApiItem } from "~/composables/useArticles";
import type { ArticleApiItem, ArticleViewItem } from "~/composables/useArticles";

type ArticleDetailApiResponse = {
  data: ArticleApiItem;
};

export function useArticleDetail(articleId: MaybeRefOrGetter<string | number>) {
  const id = computed(() => String(toValue(articleId)).trim());

  const { data, pending, error, refresh } = useAsyncData<ArticleViewItem | null>(
    () => `article-detail-${id.value}`,
    async () => {
      if (!id.value) return null;
      const response = await $fetch<ArticleDetailApiResponse>(`/api/article/${id.value}`);
      return mapArticleApiItem(response.data);
    },
    {
      default: () => null,
      server: true,
      lazy: true,
      watch: [id],
    },
  );

  const article = computed(() => data.value);

  return {
    article,
    pending,
    error,
    refresh,
  };
}
