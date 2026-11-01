/* MJX language selection: static page links stay in their language. */
(function () {
  "use strict";
  const key = "mjx-site-language";
  const toEnglish = {"index.html":"index-en.html","regulations.html":"regulations-en.html","jp.html":"en.html"};
  const name = window.location.pathname.split("/").pop() || "index.html";
  let preference = "";
  try { preference = window.localStorage.getItem(key) || ""; } catch (_) {}
  if (preference === "en" && toEnglish[name]) {
    window.location.replace(toEnglish[name] + window.location.search + window.location.hash);
    return;
  }
  if (document.documentElement.lang.toLowerCase().startsWith("en")) {
    try { window.localStorage.setItem(key, "en"); } catch (_) {}
  }
  document.addEventListener("click", function (event) {
    const anchor = event.target.closest && event.target.closest("a[data-mjx-lang]");
    if (!anchor) return;
    const selected = anchor.getAttribute("data-mjx-lang");
    if (selected === "ja" || selected === "en") {
      try { window.localStorage.setItem(key, selected); } catch (_) {}
    }
  });
})();