/* Shared mobile navigation; desktop markup remains intact. */
(() => {
  "use strict";
  const header = document.querySelector(".mjx-topbar-inner, .header-inner");
  if (!header) return;
  const nav = header.querySelector("nav.mjx-toplinks, nav.site-nav");
  const language = header.querySelector(".mjx-lang-toggle, .lang-toggle");
  if (!nav || !language) return;
  const english = document.documentElement.lang.toLowerCase().startsWith("en");
  const small = window.matchMedia("(max-width: 700px)");
  const navMarker = document.createComment("Navigation position");
  const languageMarker = document.createComment("Language position");
  header.insertBefore(navMarker, nav);
  header.insertBefore(languageMarker, language);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "mjx-mobile-menu-button";
  button.setAttribute("aria-controls", "mjx-mobile-nav-panel");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = '<span class="mjx-mobile-menu-lines" aria-hidden="true"><span></span><span></span><span></span></span>';
  const panel = document.createElement("div");
  panel.id = "mjx-mobile-nav-panel";
  panel.className = "mjx-mobile-nav-panel";
  let installed = false;
  let open = false;

  function setOpen(value) {
    open = Boolean(value && installed);
    header.classList.toggle("mjx-mobile-menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ?
      (english ? "Close navigation menu" : "ナビゲーションメニューを閉じる") :
      (english ? "Open navigation menu" : "ナビゲーションメニューを開く"));
    panel.inert = !open;
    panel.setAttribute("aria-hidden", String(!open));
  }

  function sync() {
    if (small.matches && !installed) {
      installed = true;
      panel.append(nav, language);
      header.append(button, panel);
      header.classList.add("mjx-mobile-nav-ready");
      setOpen(false);
    } else if (!small.matches && installed) {
      setOpen(false);
      navMarker.after(nav);
      languageMarker.after(language);
      panel.remove();
      button.remove();
      header.classList.remove("mjx-mobile-nav-ready");
      installed = false;
    }
  }
  button.addEventListener("click", () => setOpen(!open));
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (open && !header.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      button.focus();
    }
  });
  small.addEventListener("change", sync);
  sync();

  /* Switch the seven-document horizontal tabs to a compact selector. */
  const quicklinks = document.querySelector("nav.quicklinks");
  const list = quicklinks && quicklinks.querySelector(".quicklinks-list");
  if (!list) return;
  const picker = document.createElement("button");
  picker.type = "button";
  picker.className = "mjx-mobile-quicklinks-toggle";
  picker.setAttribute("aria-controls", "mjx-mobile-quicklinks-list");
  picker.setAttribute("aria-expanded", "false");
  picker.textContent = english ? "Choose a regulation" : "規定を選ぶ";
  picker.insertAdjacentHTML("beforeend", '<span class="mjx-mobile-quicklinks-chevron" aria-hidden="true"></span>');
  list.id = "mjx-mobile-quicklinks-list";
  let pickerOpen = false;

  function setPicker(value) {
    pickerOpen = Boolean(value && small.matches);
    quicklinks.classList.toggle("mjx-mobile-quicklinks-open", pickerOpen);
    picker.setAttribute("aria-expanded", String(pickerOpen));
    list.inert = small.matches && !pickerOpen;
    if (small.matches) list.setAttribute("aria-hidden", String(!pickerOpen));
    else list.removeAttribute("aria-hidden");
  }
  function syncPicker() {
    if (small.matches) {
      quicklinks.classList.add("mjx-mobile-quicklinks-ready");
      if (!picker.isConnected) quicklinks.insertBefore(picker, list);
      setPicker(false);
    } else {
      quicklinks.classList.remove("mjx-mobile-quicklinks-ready");
      setPicker(false);
      picker.remove();
    }
  }
  picker.addEventListener("click", () => setPicker(!pickerOpen));
  list.addEventListener("click", (event) => {
    if (event.target.closest("a")) setPicker(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pickerOpen) {
      setPicker(false);
      picker.focus();
    }
  });
  small.addEventListener("change", syncPicker);
  syncPicker();
})();
