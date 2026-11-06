/* Floating MJX official-rules assistant, available throughout the static site. */
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
  subtitle.textContent = translate("公式規定のご案内", "Official rules guidance");
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
  const openFrame = () => {
    if (frame) return;
    frame = document.createElement("iframe");
    frame.className = "mjx-ai-float-iframe";
    frame.title = translate("MJX公式規定AIチャット", "MJX official regulations AI chat");
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.setAttribute("allow", "");
    const url = new URL("rules-ai.html", window.location.href);
    url.searchParams.set("embed", "1");
    url.searchParams.set("lang", english ? "en" : "ja");
    url.searchParams.set("v", "20261106-readability-1");
    frame.src = url.href;
    frame.addEventListener("load", () => {
      loader.hidden = true;
      if (opened) {
        try { frame.contentWindow.document.getElementById("mjx-ai-question")?.focus(); }
        catch (_) { /* Focus remains on the close button if the frame is inaccessible. */ }
      }
    });
    content.appendChild(frame);
  };

  const setOpened = (value, restoreFocus = true) => {
    opened = Boolean(value);
    panel.hidden = !opened;
    launcher.setAttribute("aria-expanded", String(opened));
    launcher.setAttribute("aria-label", opened
      ? translate("AIサポーターを閉じる", "Close AI Supporter")
      : translate("AIサポーターを開く", "Open AI Supporter"));
    document.body.classList.toggle("mjx-ai-float-open", opened);
    if (opened) {
      openFrame();
      close.focus();
    } else if (restoreFocus) {
      launcher.focus();
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
  document.addEventListener("pointerdown", (event) => {
    if (opened && !root.contains(event.target)) setOpened(false, false);
  });
  window.addEventListener("message", (event) => {
    if (opened && frame && event.origin === window.location.origin &&
        event.source === frame.contentWindow && event.data?.type === "mjx-rule-ai-close") {
      setOpened(false);
    }
  });
})();
