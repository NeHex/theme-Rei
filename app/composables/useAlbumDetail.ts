import { toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";

import { mapAlbumApiItem } from "~/composables/useAlbums";
import type { AlbumApiItem, AlbumViewItem } from "~/composables/useAlbums";

type AlbumDetailApiResponse = {
  data: AlbumApiItem;
};

export function useAlbumDetail(albumId: MaybeRefOrGetter<string | number>) {
  const id = computed(() => String(toValue(albumId)).trim());

  const { data, pending, error, refresh } = useAsyncData<AlbumViewItem | null>(
    () => `album-detail-${id.value}`,
    async () => {
      if (!id.value) return null;
      const response = await $fetch<AlbumDetailApiResponse>(
        `/api/album/${encodeURIComponent(id.value)}`,
        { cache: "no-store" },
      );
      return mapAlbumApiItem(response.data);
    },
    {
      default: () => null,
      server: true,
      lazy: true,
      watch: [id],
    },
  );

  const album = computed(() => data.value);

  return {
    album,
    albumData: data,
    pending,
    error,
    refresh,
  };
}
