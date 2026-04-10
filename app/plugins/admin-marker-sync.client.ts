import { syncAdminMarker } from "~/composables/useAdminMarker";

const ADMIN_MARKER_SYNC_INIT_FLAG = "__nehex_admin_marker_sync_initialized__";

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  const globalScope = window as Window & {
    [ADMIN_MARKER_SYNC_INIT_FLAG]?: boolean;
  };
  if (globalScope[ADMIN_MARKER_SYNC_INIT_FLAG]) return;
  globalScope[ADMIN_MARKER_SYNC_INIT_FLAG] = true;

  const triggerSync = () => {
    void syncAdminMarker();
  };

  triggerSync();
  window.addEventListener("focus", triggerSync);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      triggerSync();
    }
  });
});
