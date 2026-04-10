import { resolveSiteOwnerProfile } from "../../utils/siteOwner";

export default defineEventHandler(async () => {
  try {
    return await resolveSiteOwnerProfile();
  } catch (error) {
    console.error("[setting-site-owner-api] failed to resolve site owner", error);
    return {
      avatar: "/images/head.jpg",
      nickname: "站长",
      homepage: "",
      email: "",
      bio: "",
    };
  }
});
