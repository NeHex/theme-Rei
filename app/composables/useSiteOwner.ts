import { DEFAULT_SITE_OWNER, fetchSiteOwnerProfile, type SiteOwnerProfile } from "@/services/site-owner";

export function useSiteOwner() {
  const { data, pending, error, refresh } = useAsyncData<SiteOwnerProfile>(
    "site-owner",
    async () => fetchSiteOwnerProfile(),
    {
      default: () => ({ ...DEFAULT_SITE_OWNER }),
      server: true,
      lazy: true,
    },
  );

  const owner = computed(() => data.value ?? DEFAULT_SITE_OWNER);

  return {
    owner,
    pending,
    error,
    refresh,
  };
}
