/* Global MJX language routing for all static site pages (JA / EN). */
(function () {
  "use strict";
  const storageKey = "mjx-site-language";
  const pages = {
    "index.html":         { ja: "index.html",       en: "index-en.html" },
    "index-en.html":      { ja: "index.html",       en: "index-en.html" },
    "jp.html":            { ja: "jp.html",          en: "en.html" },
    "en.html":            { ja: "jp.html",          en: "en.html" },
    "regulations.html":   { ja: "regulations.html", en: "regulations-en.html" },
    "regulations-en.html":{ ja: "regulations.html", en: "regulations-en.html" }
  };
  const path = window.location.pathname;
  const filename = path.slice(path.lastIndexOf("/") + 1) || "index.html";
  const pair = pages[filename];
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("lang");
  const requested = explicit === "en" || explicit === "ja" ? explicit : null;
  let saved = null;
  try {
    const pref = window.localStorage.getItem(storageKey);
    if (pref === "en" || pref === "ja") saved = pref;
  } catch (_) {}
  const shown = document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "ja";
  const selected = requested || saved || shown;

  // Both directions are symmetric. An explicit ?lang= choice wins over storage.
  try { window.localStorage.setItem(storageKey, selected); } catch (_) {}
  if (pair && filename !== pair[selected]) {
    const destination = new URL(window.location.href);
    destination.pathname = path.slice(0, path.lastIndexOf("/") + 1) + pair[selected];
    window.location.replace(destination.href);
    return;
  }

  // Persist an explicit user switch before navigation, including back to Japanese.
  document.addEventListener("click", function (event) {
    const node = event.target instanceof Element ? event.target.closest("a[data-mjx-lang]") : null;
    if (!node) return;
    const target = node.getAttribute("data-mjx-lang");
    if (target !== "ja" && target !== "en") return;
    try { window.localStorage.setItem(storageKey, target); } catch (_) {}
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    const self = document.querySelector('.mjx-lang-toggle a[data-mjx-lang="' + selected + '"]');
    if (self) self.setAttribute("aria-current", "true");
  });
})();