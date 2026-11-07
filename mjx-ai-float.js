/* Floating MJX official-website assistant, available throughout the static site. */
(() => {
  "use strict";
  if (document.getElementById("mjx-ai-float-root")) return;
  const params = new URLSearchParams(window.location.search);
  const selectedLanguage = params.get("lang");
  const english = selectedLanguage === "en" ||
    (selectedLanguage !== "ja" && document.documentElement.lang.toLowerCase().startsWith("en"));
  const translate = (ja, en) => english ? en : ja;

  const root = document.createElement("div");
  root.id = "mjx-ai-float-root";
  root.className = "mjx-ai-float-root";

  const launcher = document.createElement("button");
  launcher.id = "mjx-ai-float-launcher";
  launcher.className = "mjx-ai-float-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-controls", "mjx-ai-float-panel");
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-label", translate("AIサポーターを開く", "Open AI Supporter"));
  launcher.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 9 9 0 0 1-3.3-.7L4 20l1.7-4.6A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8.5 11.5h7"/></svg>';
  const launcherLabel = document.createElement("span");
  launcherLabel.textContent = translate("AIサポーター", "AI Supporter");
  launcher.appendChild(launcherLabel);

  const panel = document.createElement("section");
  panel.id = "mjx-ai-float-panel";
  panel.className = "mjx-ai-float-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "mjx-ai-float-title");
  panel.hidden = true;

  const heading = document.createElement("div");
  heading.className = "mjx-ai-float-header";
  const identity = document.createElement("div");
  identity.className = "mjx-ai-float-identity";
  const titles = document.createElement("div");
  const title = document.createElement("strong");
  title.id = "mjx-ai-float-title";
  title.textContent = translate("MJX AIサポーター", "MJX AI Supporter");
  const subtitle = document.createElement("span");
  subtitle.textContent = translate("参加方法・規定・サイトのご案内", "Website, joining & rules guidance");
  titles.append(title, subtitle);
  identity.appendChild(titles);

  const actions = document.createElement("div");
  actions.className = "mjx-ai-float-actions";
  const fullPage = document.createElement("a");
  const fullPageUrl = new URL("rules-ai.html", window.location.href);
  fullPageUrl.searchParams.set("lang", english ? "en" : "ja");
  fullPage.href = fullPageUrl.href;
  fullPage.target = "_blank";
  fullPage.rel = "noopener noreferrer";
  fullPage.textContent = translate("別画面", "New tab");
  fullPage.setAttribute("aria-label", translate("AIサポーターを別のタブで開く", "Open AI Supporter in a new tab"));

  const expand = document.createElement("button");
  expand.className = "mjx-ai-float-expand";
  expand.type = "button";
  expand.textContent = "⛶";
  expand.setAttribute("aria-pressed", "false");
  expand.setAttribute("aria-label", translate("チャットを画面いっぱいに広げる", "Expand chat to fill the screen"));
  expand.setAttribute("title", translate("チャットを拡大／元に戻す", "Maximize or restore chat"));

  const close = document.createElement("button");
  close.className = "mjx-ai-float-close";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", translate("AIサポーターを閉じる", "Close AI Supporter"));
  actions.append(fullPage, expand, close);
  heading.append(identity, actions);

  const content = document.createElement("div");
  content.className = "mjx-ai-float-content";
  const loader = document.createElement("p");
  loader.className = "mjx-ai-float-loader";
  loader.textContent = translate("チャットを読み込み中…", "Loading chat…");
  content.appendChild(loader);
  panel.append(heading, content);
  root.append(panel, launcher);
  document.body.appendChild(root);

  let frame = null;
  let opened = false;
  let hidePanelTimer = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const openFrame = () => {
    if (frame) return;
    frame = document.createElement("iframe");
    frame.className = "mjx-ai-float-iframe";
    frame.title = translate("MJX公式サイトAIチャット", "MJX official website AI chat");
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.setAttribute("allow", "");
    const url = new URL("rules-ai.html", window.location.href);
    url.searchParams.set("embed", "1");
    url.searchParams.set("lang", english ? "en" : "ja");
    url.searchParams.set("v", "20261107-site-1");
    frame.src = url.href;
    frame.addEventListener("load", () => {
      loader.hidden = true;
      // Avoid automatically opening the mobile keyboard or scrolling the host page.
    });
    content.appendChild(frame);
  };

  const setOpened = (value, restoreFocus = true) => {
    opened = Boolean(value);
    if (hidePanelTimer !== null) {
      window.clearTimeout(hidePanelTimer);
      hidePanelTimer = null;
    }
    launcher.setAttribute("aria-expanded", String(opened));
    launcher.setAttribute("aria-label", opened
      ? translate("AIサポーターを閉じる", "Close AI Supporter")
      : translate("AIサポーターを開く", "Open AI Supporter"));
    document.body.classList.toggle("mjx-ai-float-open", opened);
    if (opened) {
      panel.classList.remove("mjx-ai-float-closing");
      panel.inert = false;
      panel.hidden = false;
      openFrame();
      close.focus({ preventScroll: true });
    } else {
      if (restoreFocus) launcher.focus({ preventScroll: true });
      panel.inert = true;
      if (reducedMotion.matches) {
        panel.hidden = true;
      } else {
        panel.classList.add("mjx-ai-float-closing");
        hidePanelTimer = window.setTimeout(() => {
          if (!opened) {
            panel.hidden = true;
            panel.classList.remove("mjx-ai-float-closing");
          }
          hidePanelTimer = null;
        }, 190);
      }
    }
  };

  expand.addEventListener("click", () => {
    const maximized = root.classList.toggle("mjx-ai-float-maximized");
    expand.setAttribute("aria-pressed", String(maximized));
    expand.setAttribute("aria-label", maximized
      ? translate("チャットを元の大きさに戻す", "Restore chat size")
      : translate("チャットを画面いっぱいに広げる", "Expand chat to fill the screen"));
  });

  launcher.addEventListener("click", () => setOpened(!opened));
  close.addEventListener("click", () => setOpened(false));
  document.addEventListener("keydown", (event) => {
    if (opened && event.key === "Escape") setOpened(false);
  });
  // Deliberately do not close on outside taps, page scrolling or background interaction.
  // Visitors can consult the site while keeping the assistant open.
  window.addEventListener("message", (event) => {
    if (opened && frame && event.origin === window.location.origin &&
        event.source === frame.contentWindow && event.data?.type === "mjx-rule-ai-close") {
      setOpened(false);
    }
  });
})();
