const NAVIGATION_HANDOFF_KEY = "myperol-smooth-navigation-target";
const NAVIGATION_GAP = 12;
const FULL_SECTION_TARGETS = new Set(["servicios", "mp-systems", "calculadora"]);

function getNavigationOffset() {
  const navigation = window.matchMedia("(max-width: 902px)").matches
    ? document.querySelector<HTMLElement>(".mobile-header-bar")
    : document.querySelector<HTMLElement>(".desktop-nav");

  if (!navigation) return 0;

  return Math.max(0, navigation.getBoundingClientRect().bottom + NAVIGATION_GAP);
}

function getTargetFromHash(hash: string) {
  if (!hash || hash === "#") return null;

  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function shouldAlignToSectionTop(target: HTMLElement) {
  return FULL_SECTION_TARGETS.has(target.id);
}

function scrollToTarget(target: HTMLElement) {
  const targetTop = target.getBoundingClientRect().top + window.scrollY;
  const scrollTop = Math.max(
    0,
    targetTop - (shouldAlignToSectionTop(target) ? 0 : getNavigationOffset())
  );

  window.scrollTo({ top: scrollTop, behavior: getScrollBehavior() });
}

function scrollToPageStart() {
  window.scrollTo({ top: 0, behavior: getScrollBehavior() });
}

function updateLocationPath(pathname: string, search: string) {
  const nextPath = `${pathname}${search}`;
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath === nextPath && !window.location.hash) return;

  window.history.pushState(window.history.state, "", nextPath);
}

function replaceCurrentHash() {
  if (!window.location.hash) return;

  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}`
  );
}

function handleAnchorNavigation(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) return;

  const anchor = event.target instanceof Element
    ? event.target.closest<HTMLAnchorElement>("a[href]")
    : null;
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return;

  const isSamePath = destination.pathname === window.location.pathname;
  const isSameDocument =
    isSamePath &&
    destination.search === window.location.search;

  if (!destination.hash) {
    if (!isSameDocument) return;

    event.preventDefault();
    updateLocationPath(destination.pathname, destination.search);
    scrollToPageStart();
    return;
  }

  if (!isSamePath) {
    sessionStorage.setItem(NAVIGATION_HANDOFF_KEY, destination.hash);
    return;
  }

  const target = getTargetFromHash(destination.hash);
  if (!target) return;

  event.preventDefault();
  updateLocationPath(destination.pathname, destination.search);
  scrollToTarget(target);
}

function resumeCrossPageNavigation() {
  const targetHash = sessionStorage.getItem(NAVIGATION_HANDOFF_KEY);
  if (!targetHash || targetHash !== window.location.hash) return false;

  sessionStorage.removeItem(NAVIGATION_HANDOFF_KEY);

  const navigate = () => {
    const target = getTargetFromHash(targetHash);
    if (!target) return;

    window.scrollTo({ top: 0, behavior: "auto" });
    window.requestAnimationFrame(() => {
      scrollToTarget(target);
      window.requestAnimationFrame(replaceCurrentHash);
    });
  };

  if (document.readyState === "complete") navigate();
  else window.addEventListener("load", navigate, { once: true });

  return true;
}

function cleanInitialSectionHash() {
  const target = getTargetFromHash(window.location.hash);
  if (!target) return;

  const cleanUrl = () => {
    scrollToTarget(target);
    window.requestAnimationFrame(replaceCurrentHash);
  };

  if (document.readyState === "complete") {
    window.requestAnimationFrame(cleanUrl);
    return;
  }

  window.addEventListener("load", () => window.requestAnimationFrame(cleanUrl), { once: true });
}

export function initializeSmoothNavigation() {
  document.addEventListener("click", handleAnchorNavigation);
  if (!resumeCrossPageNavigation()) cleanInitialSectionHash();
}
