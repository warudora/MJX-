/* Reliable back-to-top for all MJX regulations pages. */
(() => {
  "use strict";

  const trigger = document.querySelector(".mjx-back-to-top");
  if (!trigger) return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let savedBehavior = null;

  function currentScroll() {
    return Math.max(0, window.scrollY || window.pageYOffset || root.scrollTop || document.body.scrollTop || 0);
  }

  function disableNativeSmoothScroll() {
    if (savedBehavior !== null) return;
    savedBehavior = {
      value: root.style.getPropertyValue("scroll-behavior"),
      priority: root.style.getPropertyPriority("scroll-behavior")
    };
    root.style.setProperty("scroll-behavior", "auto", "important");
  }

  function restoreNativeSmoothScroll() {
    if (savedBehavior === null) return;
    if (savedBehavior.value) {
      root.style.setProperty("scroll-behavior", savedBehavior.value, savedBehavior.priority);
    } else {
      root.style.removeProperty("scroll-behavior");
    }
    savedBehavior = null;
  }

  function stopAnimation() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    restoreNativeSmoothScroll();
  }

  function snapToTop() {
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }

  function goToTop() {
    stopAnimation();
    disableNativeSmoothScroll();

    const initial = currentScroll();
    if (initial <= 1 || reducedMotion.matches) {
      snapToTop();
      restoreNativeSmoothScroll();
      return;
    }

    const duration = Math.min(650, Math.max(340, 340 + initial / 420));
    let started = null;

    function tick(now) {
      if (started === null) started = now;
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      window.scrollTo(0, Math.max(0, initial * (1 - eased)));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        frame = 0;
        snapToTop();
        restoreNativeSmoothScroll();
      }
    }
    frame = window.requestAnimationFrame(tick);
  }

  trigger.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    // Replace the previous article fragment without creating another history entry.
    try {
      if (window.location.hash !== "#page-top") {
        window.history.replaceState(window.history.state, "", "#page-top");
      }
    } catch (_) {
      // Scrolling must still work in browsers that restrict history updates.
    }

    goToTop();
  });

  // Allow a real touch, wheel, or keyboard scroll to interrupt the animation.
  window.addEventListener("wheel", stopAnimation, { passive: true });
  window.addEventListener("touchstart", stopAnimation, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " ", "Spacebar"].includes(event.key)) {
      stopAnimation();
    }
  });
  window.addEventListener("pagehide", stopAnimation);
})();
