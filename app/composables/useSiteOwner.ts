export type SiteOwnerProfile = {
  avatar: string;
  nickname: string;
  homepage: string;
  email: string;
  bio: string;
};

const DEFAULT_SITE_OWNER: SiteOwnerProfile = {
  avatar: "/images/head.jpg",
  nickname: "站长",
  homepage: "",
  email: "",
  bio: "",
};

type SiteOwnerApiResponse = SiteOwnerProfile | { data?: SiteOwnerProfile | null };

function normalizeSiteOwnerPayload(payload: SiteOwnerApiResponse): SiteOwnerProfile {
  const source = (payload as { data?: SiteOwnerProfile | null })?.data
    ?? (payload as SiteOwnerProfile)
    ?? DEFAULT_SITE_OWNER;

  return {
    avatar: String(source.avatar || DEFAULT_SITE_OWNER.avatar),
    nickname: String(source.nickname || DEFAULT_SITE_OWNER.nickname),
    homepage: String(source.homepage || ""),
    email: String(source.email || ""),
    bio: String(source.bio || ""),
  };
}

export function useSiteOwner() {
  const { data, pending, error, refresh } = useAsyncData<SiteOwnerProfile>(
    "site-owner",
    async () => {
      const response = await $fetch<SiteOwnerApiResponse>("/api/setting/site-owner");
      return normalizeSiteOwnerPayload(response);
    },
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
