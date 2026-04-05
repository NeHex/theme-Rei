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

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return;

  let observer: MutationObserver | null = null;
  const resolveObserveRoot = () => document.getElementById("__nuxt") ?? document.body;

  const stopObserver = () => {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  };

  const start = () => {
    document.documentElement.classList.add(READY_CLASS);
    scanImages(document);

    stopObserver();
    observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLImageElement) {
            prepareImage(node);
            continue;
          }

          if (node instanceof HTMLElement) {
            scanImages(node);
          }
        }
      }
    });

    observer.observe(resolveObserveRoot(), {
      subtree: true,
      childList: true,
    });
  };

  nuxtApp.hook("app:mounted", start);

  nuxtApp.hook("page:finish", () => {
    requestAnimationFrame(() => scanImages(document));
  });

  nuxtApp.hook("app:error", () => {
    requestAnimationFrame(() => scanImages(document));
  });

  nuxtApp.hook("app:beforeMount", stopObserver);
});
