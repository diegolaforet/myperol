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

function updateLocationHash(hash: string) {
  if (window.location.hash === hash) {
    window.history.replaceState(window.history.state, "", hash);
    return;
  }

  window.history.pushState(window.history.state, "", hash);
}

function updateLocationPath(pathname: string, search: string) {
  const nextPath = `${pathname}${search}`;
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath === nextPath && !window.location.hash) return;

  window.history.pushState(window.history.state, "", nextPath);
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

  const isSameDocument =
    destination.pathname === window.location.pathname &&
    destination.search === window.location.search;

  if (!destination.hash) {
    if (!isSameDocument) return;

    event.preventDefault();
    updateLocationPath(destination.pathname, destination.search);
    scrollToPageStart();
    return;
  }

  if (!isSameDocument) {
    sessionStorage.setItem(NAVIGATION_HANDOFF_KEY, destination.hash);
    return;
  }

  const target = getTargetFromHash(destination.hash);
  if (!target) return;

  event.preventDefault();
  updateLocationHash(destination.hash);
  scrollToTarget(target);
}

function resumeCrossPageNavigation() {
  const targetHash = sessionStorage.getItem(NAVIGATION_HANDOFF_KEY);
  if (!targetHash || targetHash !== window.location.hash) return;

  sessionStorage.removeItem(NAVIGATION_HANDOFF_KEY);

  const navigate = () => {
    const target = getTargetFromHash(targetHash);
    if (!target) return;

    window.scrollTo({ top: 0, behavior: "auto" });
    window.requestAnimationFrame(() => scrollToTarget(target));
  };

  if (document.readyState === "complete") navigate();
  else window.addEventListener("load", navigate, { once: true });
}

export function initializeSmoothNavigation() {
  document.addEventListener("click", handleAnchorNavigation);
  resumeCrossPageNavigation();
}
