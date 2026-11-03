/* Anywhere-accessible chapter navigation for MJX full regulations. */
(() => {
  "use strict";
  const documents = Array.from(document.querySelectorAll("main#main-content section.regulation[id]"));
  const sidebar = document.querySelector(".sidebar");
  if (documents.length !== 7 || !sidebar || typeof HTMLDialogElement === "undefined") return;

  const english = document.documentElement.lang.toLowerCase().startsWith("en");
  const compact = window.matchMedia("(max-width: 700px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const names = documents.map((section) => {
    const heading = section.querySelector(".document-head h2");
    return heading ? heading.textContent.trim() : section.id;
  });

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "mjx-toc-fab";
  trigger.setAttribute("aria-controls", "mjx-toc-dialog");
  trigger.setAttribute("aria-expanded", "false");

  const icon = document.createElement("span");
  icon.className = "mjx-toc-fab-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "≡";
  const buttonLabel = document.createElement("span");
  buttonLabel.className = "mjx-toc-fab-label";
  buttonLabel.textContent = english ? "Contents" : "目次";
  const currentLabel = document.createElement("span");
  currentLabel.className = "mjx-toc-fab-current";
  currentLabel.textContent = english ? "Choose a regulation" : "規定を選ぶ";
  trigger.append(icon, buttonLabel, currentLabel);
  trigger.setAttribute("aria-label", english ? "Open regulations and article contents" : "規定・条文の目次を開く");

  const dialog = document.createElement("dialog");
  dialog.id = "mjx-toc-dialog";
  dialog.className = "mjx-toc-dialog";
  dialog.setAttribute("aria-labelledby", "mjx-toc-dialog-title");

  const header = document.createElement("div");
  header.className = "mjx-toc-header";
  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  title.id = "mjx-toc-dialog-title";
  title.className = "mjx-toc-heading";
  title.textContent = english ? "Regulations contents" : "規定全文の目次";
  const hint = document.createElement("p");
  hint.className = "mjx-toc-subheading";
  hint.textContent = english ? "Choose a regulation, chapter or article" : "規定や章・条文を選ぶと移動します";
  titleWrap.append(title, hint);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "mjx-toc-close";
  close.textContent = english ? "Close" : "閉じる";
  close.setAttribute("aria-label", english ? "Close contents" : "目次を閉じる");
  header.append(titleWrap, close);
  dialog.append(header);

  const scroll = document.createElement("nav");
  scroll.className = "mjx-toc-scroll";
  scroll.setAttribute("aria-label", english ? "Regulations and articles" : "規定と条文");
  const items = [];

  documents.forEach((section, index) => {
    const item = document.createElement("details");
    item.className = "mjx-toc-item";
    const summary = document.createElement("summary");
    const number = document.createElement("span");
    number.className = "mjx-toc-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.className = "mjx-toc-title";
    label.textContent = names[index];
    summary.append(number, label);
    item.append(summary);

    const links = document.createElement("div");
    links.className = "mjx-toc-links";
    const start = document.createElement("a");
    start.className = "mjx-toc-document-link";
    start.href = "#" + section.id;
    start.textContent = english ? "Go to start of this regulation" : "この規定の先頭へ";
    links.append(start);
    section.querySelectorAll(".doc-toc-list a[href^='#']").forEach((source) => {
      const id = source.getAttribute("href").slice(1);
      if (!document.getElementById(id)) return;
      const link = document.createElement("a");
      link.href = "#" + id;
      link.textContent = source.textContent.trim();
      links.append(link);
    });
    item.append(links);
    scroll.append(item);
    items.push(item);
  });
  dialog.append(scroll);
  document.body.append(trigger, dialog);
  document.body.classList.add("mjx-toc-ready");

  function activeIndex() {
    const firstTop = documents[0].getBoundingClientRect().top;
    if (firstTop > 180) return -1;
    let index = 0;
    documents.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= 180) index = i;
    });
    return index;
  }

  function syncCurrent() {
    const index = activeIndex();
    currentLabel.textContent = index < 0 ?
      (english ? "Choose a regulation" : "規定を選ぶ") : names[index];
  }
  let scheduled = false;
  window.addEventListener("scroll", () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      syncCurrent();
    });
  }, {passive: true});

  function openContents() {
    if (!compact.matches || dialog.open) return;
    const index = activeIndex();
    items.forEach((item, i) => {
      item.open = i === (index < 0 ? 0 : index);
      item.classList.toggle("is-active", i === index);
    });
    trigger.setAttribute("aria-expanded", "true");
    dialog.showModal();
    document.body.classList.add("mjx-toc-dialog-open");
    close.focus({preventScroll: true});
    window.requestAnimationFrame(() => {
      const selected = items[Math.max(0, index)];
      if (dialog.open && selected) selected.scrollIntoView({block: "nearest"});
    });
  }

  trigger.addEventListener("click", openContents);
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("mjx-toc-dialog-open");
    trigger.setAttribute("aria-expanded", "false");
    if (compact.matches) trigger.focus({preventScroll: true});
    syncCurrent();
  });
  scroll.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    dialog.close();
    const hash = "#" + encodeURIComponent(id);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    target.scrollIntoView({behavior: reduced.matches ? "auto" : "smooth", block: "start"});
    window.requestAnimationFrame(syncCurrent);
  });
  compact.addEventListener("change", () => {
    if (!compact.matches && dialog.open) dialog.close();
    syncCurrent();
  });
  window.addEventListener("hashchange", syncCurrent);
  syncCurrent();
})();
