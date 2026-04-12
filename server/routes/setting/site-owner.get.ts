import { resolveSiteOwnerProfile } from "../../utils/siteOwner";
import { logBackendFallback } from "../../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await resolveSiteOwnerProfile();
  } catch (error) {
    logBackendFallback("setting-site-owner-route", error);
    return {
      avatar: "/images/head.jpg",
      nickname: "站长",
      homepage: "",
      email: "",
      bio: "",
    };
  }
});
