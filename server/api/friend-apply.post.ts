type FriendApplyPayload = {
  site_title: string;
  site_url: string;
  site_description: string;
  site_icon?: string | null;
  contact?: string | null;
};

import { backendFetch } from "../utils/backendFetch";
import { validateFriendApplyPayload } from "../utils/inputContracts.js";

export default defineEventHandler(async (event) => {
  let requestBody: ReturnType<typeof validateFriendApplyPayload>;
  try {
    requestBody = validateFriendApplyPayload(await readBody<FriendApplyPayload>(event));
  } catch (error) {
    throw createError({
      statusCode: 422,
      statusMessage: error instanceof Error ? error.message : "Invalid friend apply payload",
    });
  }

  const forwardedFor =
    getRequestHeader(event, "x-forwarded-for") ||
    getRequestHeader(event, "x-real-ip") ||
    event.node.req.socket.remoteAddress ||
    "";
  const userAgent = getRequestHeader(event, "user-agent") || "";

  const headers = {
    "x-forwarded-for": forwardedFor,
    "user-agent": userAgent,
  };

  try {
    return await backendFetch("/friend/apply", {
      method: "POST",
      body: requestBody,
      headers,
      retry: 0,
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
      return await backendFetch("/friend-apply", {
        method: "POST",
        body: requestBody,
        headers,
        retry: 0,
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
