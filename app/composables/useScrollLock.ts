const SCROLL_LOCK_STATE_KEY = "site-scroll-lock-count";

function applyBodyOverflow(lockCount: number) {
  if (!import.meta.client) return;
  document.body.style.overflow = lockCount > 0 ? "hidden" : "";
}

export function useScrollLock() {
  const lockCount = useState<number>(SCROLL_LOCK_STATE_KEY, () => 0);

  function lockScroll() {
    lockCount.value += 1;
    applyBodyOverflow(lockCount.value);
  }

  function unlockScroll() {
    lockCount.value = Math.max(0, lockCount.value - 1);
    applyBodyOverflow(lockCount.value);
  }

  return {
    lockScroll,
    unlockScroll,
    isScrollLocked: computed(() => lockCount.value > 0),
  };
}
