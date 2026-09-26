export function initializeHeroVideo() {
  const video = document.querySelector<HTMLVideoElement>(".home-video-hero__media");
  if (!video) return;
  let visible = false;
  const updatePlayback = () => {
    if (visible && !document.hidden) void video.play().catch(() => undefined);
    else video.pause();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  });
  observer.observe(video);
  document.addEventListener("visibilitychange", updatePlayback);
}
