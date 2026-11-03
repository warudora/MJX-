/* Animated regulation card disclosures, with native details semantics. */
(() => {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cleanup = [];
  document.querySelectorAll(".rule details").forEach((details) => {
    const summary = details.querySelector("summary");
    const panel = details.querySelector(".rule-details");
    if (!summary || !panel) return;
    let animation = null;
    let opening = false;
    function reset() {
      panel.style.removeProperty("height");
      panel.style.removeProperty("overflow");
      panel.style.removeProperty("opacity");
      delete details.dataset.collapsing;
    }
    function cancel() {
      if (animation) {
        animation.cancel();
        animation = null;
      }
    }
    summary.addEventListener("click", (event) => {
      event.preventDefault();
      const wantOpen = animation ? !opening : !details.open;
      const from = details.open ? panel.getBoundingClientRect().height : 0;
      cancel();
      if (reduced.matches || typeof panel.animate !== "function") {
        details.open = wantOpen;
        reset();
        return;
      }
      details.open = true;
      if (wantOpen) delete details.dataset.collapsing;
      else details.dataset.collapsing = "true";
      const to = wantOpen ? panel.scrollHeight : 0;
      if (Math.abs(to - from) < 1) {
        details.open = wantOpen;
        reset();
        return;
      }
      panel.style.height = from + "px";
      panel.style.overflow = "hidden";
      opening = wantOpen;
      const current = panel.animate([
        {height:from + "px", opacity:wantOpen ? .75 : 1},
        {height:to + "px", opacity:wantOpen ? 1 : .75}
      ], {
        duration:Math.min(430, 240 + Math.abs(to - from) * .18),
        easing:"cubic-bezier(.2,.75,.2,1)",
        fill:"forwards"
      });
      animation = current;
      current.addEventListener("finish", () => {
        if (animation !== current) return;
        animation = null;
        details.open = wantOpen;
        reset();
      }, {once:true});
    });
    cleanup.push(() => {cancel(); reset();});
  });
  window.addEventListener("beforeprint", () => cleanup.forEach((stop) => stop()));
})();
