export function initializeHeroVideo() {
  const video = document.querySelector<HTMLVideoElement>(".home-video-hero__media");
  if (!video) return;
  let visible = false;
  let disposed = false;
  const updatePlayback = () => {
    if (disposed) return;
    if (visible && !document.hidden) void video.play().catch(() => undefined);
    else video.pause();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  });
  observer.observe(video);
  document.addEventListener("visibilitychange", updatePlayback);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    document.removeEventListener("visibilitychange", updatePlayback);
    document.removeEventListener("astro:before-swap", dispose);
    video.pause();
  };
  document.addEventListener("astro:before-swap", dispose, { once: true });
}
