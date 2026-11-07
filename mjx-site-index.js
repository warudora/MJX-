/* Site-wide official-source index for local search fallback (no API keys). */
(() => {
  "use strict";
  const pageItem = (id, documentName, title, text, href) => ({
    id, document: documentName, title, text: String(text || "").slice(0, 3000), href
  });
  const textOf = (node) => (node?.textContent || "").replace(/\s+/g, " ").trim();
  async function fetchPage(path) {
    const response = await fetch(path, { cache: "no-cache", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Source unavailable");
    return new DOMParser().parseFromString(await response.text(), "text/html");
  }
  function joining(dom) {
    const items = [];
    const banner = dom.querySelector(".join-banner");
    if (banner) items.push(pageItem("join-early", "参加方法", "早期アクセスとModパックの入手",
      textOf(banner), "join.html?lang=ja#join-steps"));
    const steps = [...dom.querySelectorAll("li.join-step")];
    if (steps.length !== 7) throw new Error("Incomplete guide");
    steps.forEach((step, index) => {
      const number = String(index + 1).padStart(2, "0");
      items.push(pageItem("join-step-" + number, "参加方法", textOf(step.querySelector("h3")),
        textOf(step), "join.html?lang=ja#join-step-" + number));
    });
    const roles = [...dom.querySelectorAll("article.join-role")];
    const ids = ["join-visitor", "join-builder-new", "join-builder-legacy"];
    if (roles.length !== 3) throw new Error("Incomplete roles");
    roles.forEach((role, index) => items.push(pageItem(ids[index], "参加方法・ビルダー資格",
      textOf(role.querySelector("h3")), textOf(role), "join.html?lang=ja#" + ids[index])));
    const help = dom.getElementById("join-help-title")?.closest("section");
    if (help) items.push(pageItem("join-help", "参加方法", "トラブルシューティング・問い合わせ",
      textOf(help), "join.html?lang=ja#join-help-title"));
    return items;
  }
  function about(dom) {
    const items = [];
    const history = dom.getElementById("history");
    const intro = [...(history?.querySelectorAll(":scope > p") || [])].map(textOf).join(" ");
    if (intro) items.push(pageItem("about-history", "MJXについて", "MJXの成り立ちと3コミュニティの統合",
      intro, "jp.html?lang=ja#history"));
    for (const card of dom.querySelectorAll(".origin-grid .origin")) {
      const title = textOf(card.querySelector("h3"));
      const id = "about-" + title.toLowerCase();
      if (["about-mjas", "about-mtts", "about-jnc"].includes(id)) {
        items.push(pageItem(id, "MJXについて", title, textOf(card), "jp.html?lang=ja#communities"));
      }
    }
    for (const name of ["purpose", "closing"]) {
      const section = dom.getElementById(name);
      if (section) items.push(pageItem("about-" + name, "MJXについて", name === "purpose" ? "MJXのコンセプトと目的" : "最後に・MJXの活動",
        textOf(section), "jp.html?lang=ja#" + name));
    }
    if (items.length < 6) throw new Error("Incomplete community overview");
    return items;
  }
  function overview(dom) {
    const items = [];
    for (const card of dom.querySelectorAll("article.rule[id^='doc-0']")) {
      const match = /^doc-0([1-7])$/.exec(card.id);
      if (!match) continue;
      items.push(pageItem("overview-" + match[1], "公式7規定", textOf(card.querySelector("h3")),
        textOf(card.querySelector(".desc")) + " / 2026年11月1日施行",
        "regulations.html?lang=ja#" + card.id));
    }
    if (items.length !== 7) throw new Error("Incomplete rulebook overview");
    return items;
  }
  function home(dom) {
    const intro = dom.querySelector(".mjx-hero p");
    return intro ? [pageItem("home-about", "公式サイト", "MTR Japan Nexus（MJX）公式サイトの案内",
      textOf(intro) + " 運営への問い合わせは公式Discordから。", "index.html?lang=ja")] : [];
  }
  let data = null;
  let loading = null;
  async function load(loadRegulations) {
    if (data) return data;
    if (loading) return loading;
    loading = (async () => {
      const jobs = [
        loadRegulations(),
        fetchPage("join.html").then(joining),
        fetchPage("jp.html").then(about),
        fetchPage("regulations.html").then(overview),
        fetchPage("index.html").then(home)
      ];
      const results = await Promise.allSettled(jobs);
      const sources = results.filter((item) => item.status === "fulfilled").flatMap((item) => item.value);
      if (!sources.length) throw new Error("No source available");
      data = sources;
      return data;
    })();
    try { return await loading; } finally { loading = null; }
  }
  function href(id) {
    if (/^doc[1-7]-article-\d+$/.test(id)) return "regulations-full.html?lang=ja#" + id;
    if (id === "join-early") return "join.html?lang=ja#join-steps";
    if (/^join-step-0[1-7]$/.test(id) || /^(?:join-visitor|join-builder-new|join-builder-legacy)$/.test(id)) return "join.html?lang=ja#" + id;
    if (id === "join-help") return "join.html?lang=ja#join-help-title";
    if (/^about-(?:history|purpose|closing)$/.test(id)) return "jp.html?lang=ja#" + id.slice(6);
    if (/^about-(?:mjas|mtts|jnc)$/.test(id)) return "jp.html?lang=ja#communities";
    if (/^overview-[1-7]$/.test(id)) return "regulations.html?lang=ja#doc-0" + id.slice(-1);
    if (id === "home-about") return "index.html?lang=ja";
    return null;
  }
  function scoreBoost(item, query) {
    let value = 0;
    if (/参加方法|参加したい|入り方|サーバーに入|join|connect|modpack|modパック|prism|ランチャー|\/start|接続アドレス|マルチプレイ/i.test(query) && item.id.startsWith("join-")) value += 35;
    if (/試験|資格|免除|mcp|mgsa|ビルダーにな|builder exam|become a builder/i.test(query) && item.id.startsWith("join-builder-")) value += 115;
    if (/mjas|mtts|jnc|成り立ち|統合|創設|どんなサーバー|about mjx|history|communities/i.test(query) && item.id.startsWith("about-")) value += 100;
    if (/規定一覧|7規定|七規定|rulebook|施行日|effective date/i.test(query) && item.id.startsWith("overview-")) value += 80;
    const step = {
      "01": /modパック.*(入手|ダウンロード)|modpack|配布/i,
      "02": /prism|ランチャー|launcher/i,
      "03": /インポート|読み込|import|zip/i,
      "04": /minecraft.*起動|マイクラ.*起動|ゲームが起動|launch minecraft/i,
      "05": /\/start|サーバー.*起動|start server|discord.*start/i,
      "06": /サーバーステータス|接続アドレス|playit|status|server address/i,
      "07": /接続(する|できない|方法)|マルチプレイ|入れない|join.*server|multiplayer/i
    };
    for (const [number, pattern] of Object.entries(step)) if (item.id === "join-step-" + number && pattern.test(query)) value += 95;
    if (/エラー|起動しない|接続できない|トラブル|困った|error|troubleshoot/i.test(query) && item.id === "join-help") value += 110;
    return value;
  }
  window.MJXSiteIndex = Object.freeze({ load, href, scoreBoost });
})();
