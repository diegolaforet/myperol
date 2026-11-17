/** Tracks actual canvas visibility independently from the download proximity. */
export function observeSceneVisibility(target: HTMLElement, onChange: (visible: boolean) => void) {
  let intersecting = false;
  let suspended = false;
  let visible = false;
  let disposed = false;
  const waiters = new Set<{ resolve: () => void; reject: (error: DOMException) => void }>();
  const update = () => {
    const next = intersecting && !document.hidden && !suspended && !disposed;
    if (next === visible) return;
    visible = next;
    onChange(visible);
    if (visible) {
      waiters.forEach(waiter => waiter.resolve());
      waiters.clear();
    }
  };
  const observer = new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
    update();
  }, { threshold: [0, 0.001] });
  const hide = () => { suspended = true; update(); };
  const show = () => { suspended = false; update(); };
  observer.observe(target);
  document.addEventListener("visibilitychange", update);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);

  return {
    whenVisible(): Promise<void> {
      if (disposed) return Promise.reject(new DOMException("Scene disposed", "AbortError"));
      if (visible) return Promise.resolve();
      return new Promise((resolve, reject) => waiters.add({ resolve, reject }));
    },
    dispose() {
      disposed = true;
      update();
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      waiters.forEach(waiter => waiter.reject(new DOMException("Scene disposed", "AbortError")));
      waiters.clear();
    },
  };
}
