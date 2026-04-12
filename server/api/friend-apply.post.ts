type FriendApplyPayload = {
  site_title: string;
  site_url: string;
  site_description: string;
  site_icon?: string | null;
  contact?: string | null;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export default defineEventHandler(async (event) => {
  const body = await readBody<FriendApplyPayload>(event);

  if (
    !body ||
    !String(body.site_title || "").trim() ||
    !String(body.site_url || "").trim() ||
    !String(body.site_description || "").trim()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required friend apply payload",
    });
  }

  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    "http://127.0.0.1:7878";
  const base = normalizeBaseUrl(String(apiBase));

  const forwardedFor =
    getRequestHeader(event, "x-forwarded-for") ||
    getRequestHeader(event, "x-real-ip") ||
    event.node.req.socket.remoteAddress ||
    "";
  const userAgent = getRequestHeader(event, "user-agent") || "";

  const requestBody: FriendApplyPayload = {
    site_title: String(body.site_title).trim(),
    site_url: String(body.site_url).trim(),
    site_description: String(body.site_description).trim(),
    site_icon: String(body.site_icon || "").trim() || null,
    contact: String(body.contact || "").trim() || null,
  };

  const headers = {
    "x-forwarded-for": forwardedFor,
    "user-agent": userAgent,
  };

  try {
    return await $fetch(`${base}/friend/apply`, {
      method: "POST",
      body: requestBody,
      headers,
      timeout: 12000,
    });
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 500);
    if (statusCode !== 404) {
      const statusMessage = String(
        error?.response?._data?.detail || error?.statusMessage || "Failed to submit friend apply",
      );
      throw createError({ statusCode, statusMessage });
    }

    try {
      return await $fetch(`${base}/friend-apply`, {
        method: "POST",
        body: requestBody,
        headers,
        timeout: 12000,
      });
    } catch (fallbackError: any) {
      const fallbackStatusCode = Number(
        fallbackError?.response?.status || fallbackError?.statusCode || 502,
      );
      const fallbackStatusMessage = String(
        fallbackError?.response?._data?.detail
          || fallbackError?.statusMessage
          || "Failed to submit friend apply",
      );
      throw createError({
        statusCode: fallbackStatusCode,
        statusMessage: fallbackStatusMessage,
      });
    }
  }
});
