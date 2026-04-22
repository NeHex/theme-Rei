export type SiteOwnerProfile = {
  avatar: string;
  nickname: string;
  homepage: string;
  email: string;
  bio: string;
};

export const DEFAULT_SITE_OWNER: SiteOwnerProfile = {
  avatar: "/images/head.jpg",
  nickname: "站长",
  homepage: "",
  email: "",
  bio: "",
};

type SiteOwnerApiResponse =
  | SiteOwnerProfile
  | {
      data?: Partial<SiteOwnerProfile> | null;
    };

function asText(value: unknown) {
  return String(value || "").trim();
}

function normalizeSiteOwnerPayload(payload: SiteOwnerApiResponse): SiteOwnerProfile {
  const source = (payload as { data?: Partial<SiteOwnerProfile> | null })?.data
    ?? (payload as Partial<SiteOwnerProfile>)
    ?? DEFAULT_SITE_OWNER;

  return {
    avatar: asText(source.avatar) || DEFAULT_SITE_OWNER.avatar,
    nickname: asText(source.nickname) || DEFAULT_SITE_OWNER.nickname,
    homepage: asText(source.homepage),
    email: asText(source.email),
    bio: String(source.bio || "").replace(/\\n/g, "\n"),
  };
}

async function requestSiteOwner(endpoint: string) {
  const response = await $fetch<SiteOwnerApiResponse>(endpoint, {
    method: "GET",
    cache: "no-store",
  });
  return normalizeSiteOwnerPayload(response);
}

export async function fetchSiteOwnerProfile() {
  try {
    return await requestSiteOwner("/site-owner");
  } catch {
    return await requestSiteOwner("/setting/site-owner");
  }
}
