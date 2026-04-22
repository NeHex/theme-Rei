import { toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";

import { mapDailyApiItem } from "~/composables/useDailies";
import type { DailyApiItem, DailyViewItem } from "~/composables/useDailies";

type DailyDetailApiResponse = {
  data: DailyApiItem;
};

export function useDailyDetail(dailyId: MaybeRefOrGetter<string | number>) {
  const id = computed(() => String(toValue(dailyId)).trim());

  const { data, pending, error, refresh } = useAsyncData<DailyViewItem | null>(
    () => `daily-detail-${id.value}`,
    async () => {
      if (!id.value) return null;
      const response = await $fetch<DailyDetailApiResponse>(
        `/api/daily/${encodeURIComponent(id.value)}`,
        { cache: "no-store" },
      );
      return mapDailyApiItem(response.data);
    },
    {
      default: () => null,
      server: true,
      lazy: true,
      watch: [id],
    },
  );

  const daily = computed(() => data.value);

  return {
    daily,
    pending,
    error,
    refresh,
  };
}
