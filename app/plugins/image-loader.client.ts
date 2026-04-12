const LOADING_CLASS = "app-img-is-loading";
const LOADED_CLASS = "app-img-is-loaded";
const ERROR_CLASS = "app-img-is-error";
const READY_CLASS = "app-image-loader-ready";
const IGNORE_ATTR = "data-image-loader-ignore";
const TRACK_ATTR = "data-image-loader-bound";
const SOURCE_ATTR = "data-image-loader-source";

function getImageSourceKey(img: HTMLImageElement) {
  const src = img.currentSrc || img.getAttribute("src") || "";
  const srcset = img.getAttribute("srcset") || "";
  return `${src}::${srcset}`;
}

function shouldIgnore(img: HTMLImageElement) {
  return img.hasAttribute(IGNORE_ATTR) || Boolean(img.closest(`[${IGNORE_ATTR}]`));
}

function markLoading(img: HTMLImageElement) {
  img.classList.add(LOADING_CLASS);
  img.classList.remove(LOADED_CLASS);
  img.classList.remove(ERROR_CLASS);
}

function markLoaded(img: HTMLImageElement) {
  img.classList.remove(LOADING_CLASS);
  img.classList.add(LOADED_CLASS);
  img.classList.remove(ERROR_CLASS);
}

function markError(img: HTMLImageElement) {
  img.classList.remove(LOADING_CLASS);
  img.classList.add(LOADED_CLASS);
  img.classList.add(ERROR_CLASS);
}

function prepareImage(img: HTMLImageElement) {
  if (shouldIgnore(img)) return;
  if (!img.getAttribute("src") && !img.getAttribute("srcset")) return;

  const sourceKey = getImageSourceKey(img);
  const lastSourceKey = img.getAttribute(SOURCE_ATTR);
  const isBound = img.getAttribute(TRACK_ATTR) === "1";
  if (isBound && lastSourceKey === sourceKey) return;

  img.setAttribute(TRACK_ATTR, "1");
  img.setAttribute(SOURCE_ATTR, sourceKey);

  if (img.complete && img.naturalWidth > 0) {
    markLoaded(img);
    return;
  }

  markLoading(img);

  const onLoad = () => {
    markLoaded(img);
  };

  const onError = () => {
    markError(img);
  };

  img.addEventListener("load", onLoad, { once: true });
  img.addEventListener("error", onError, { once: true });
}

function scanImages(root: ParentNode) {
  root.querySelectorAll("img").forEach((node) => {
    if (node instanceof HTMLImageElement) {
      prepareImage(node);
    }
  });
}

function scanRootNode(node: Node | ParentNode) {
  if (node instanceof HTMLImageElement) {
    prepareImage(node);
    return;
  }

  if (
    node instanceof Document
    || node instanceof DocumentFragment
    || node instanceof HTMLElement
  ) {
    scanImages(node);
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return;

  let observer: MutationObserver | null = null;
  let rafId = 0;
  const pendingScanNodes = new Set<Node | ParentNode>();
  const resolveObserveRoot = () => document.getElementById("__nuxt") ?? document.body;

  const stopObserver = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    pendingScanNodes.clear();

    if (!observer) return;
    observer.disconnect();
    observer = null;
  };

  const flushScanQueue = () => {
    rafId = 0;
    if (!pendingScanNodes.size) return;

    const nodes = [...pendingScanNodes];
    pendingScanNodes.clear();

    for (const node of nodes) {
      scanRootNode(node);
    }
  };

  const scheduleScan = (node: Node | ParentNode = document) => {
    pendingScanNodes.add(node);
    if (rafId) return;

    rafId = requestAnimationFrame(flushScanQueue);
  };

  const start = () => {
    document.documentElement.classList.add(READY_CLASS);
    stopObserver();
    scheduleScan(document);
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.target instanceof HTMLImageElement) {
          scheduleScan(record.target);
          continue;
        }

        for (const node of record.addedNodes) {
          scheduleScan(node);
        }
      }
    });

    observer.observe(resolveObserveRoot(), {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });
  };

  nuxtApp.hook("app:mounted", start);

  nuxtApp.hook("page:finish", () => {
    scheduleScan(document);
  });

  nuxtApp.hook("app:error", () => {
    scheduleScan(document);
  });

  nuxtApp.hook("app:beforeMount", stopObserver);
});
