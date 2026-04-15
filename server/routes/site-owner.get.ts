import { resolveSiteOwnerProfile } from "../utils/siteOwner";
import { logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return {
      data: await resolveSiteOwnerProfile(),
    };
  } catch (error) {
    logBackendFallback("site-owner-route", error);
    return {
      data: {
        avatar: "/images/head.jpg",
        nickname: "站长",
        homepage: "",
        email: "",
        bio: "",
      },
    };
  }
});
