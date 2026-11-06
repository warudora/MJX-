(() => {
  "use strict";
  const lang = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "ja";
  const english = lang === "en";
  document.documentElement.lang = lang;
  const $ = (id) => document.getElementById(id);
  const historyBox = $("mjx-ai-history");
  const form = $("mjx-ai-form");
  const input = $("mjx-ai-question");
  const submit = $("mjx-ai-submit");
  const status = $("mjx-ai-mode");
  const hint = $("mjx-ai-hint");
  const endpointValue = typeof window.MJX_RULE_AI_ENDPOINT === "string" ? window.MJX_RULE_AI_ENDPOINT.trim() : "";
  let endpoint = "";
  try {
    const parsed = new URL(endpointValue);
    if (parsed.protocol === "https:") endpoint = parsed.href;
  } catch (_) { /* Search-only mode when no endpoint is configured. */ }
  const label = (ja, en) => english ? en : ja;
  const documentLabels = {
    1: "共通サーバー規定", 2: "Builder規定", 3: "Visitor規定",
    4: "経済規定", 5: "リソースパック統一規約",
    6: "映画館システム利用ポリシー", 7: "プライバシーポリシー"
  };
  const aliases = [
    ["ビジター", "visitor", "訪問者", "設置", "建築"],
    ["ビルダー", "builder", "開発", "建築"],
    ["映画館", "上映", "動画", "映像", "著作権", "cinema", "screening"],
    ["個人情報", "ログ", "保存期間", "プライバシー", "privacy", "data", "retention"],
    ["通貨", "お金", "価格", "運賃", "経済", "money", "economy"],
    ["リソースパック", "resource pack", "配布", "改変", "テクスチャ"],
    ["違反", "禁止", "処分", "異議", "ban", "appeal"]
  ];
  let regulations = null;
  let loading = null;
  function normalize(text) {
    return String(text || "").normalize("NFKC").toLocaleLowerCase("ja").replace(/\s+/g, " ");
  }
  function queryWords(text) {
    let query = normalize(text).replace(/できますか|してもいい|について|教えて|どうすれば|何ですか|どこですか|ありますか|でしょうか|できます|したい|のですか|ですか|は|が|を|に|で|の|も|か|？|\?/g, " ");
    const words = query.split(/[\s、。,.!！:：]+/).filter((word) => word.length >= 2);
    const set = new Set(words);
    for (const w of words) {
      if (w.length > 2) for (let i = 0; i < w.length - 1; i += 1) set.add(w.slice(i, i + 2));
    }
    for (const group of aliases) {
      if (group.some((w) => normalize(text).includes(normalize(w)))) {
        for (const w of group) set.add(normalize(w));
      }
    }
    return [...set].filter((w) => w.length >= 2).slice(0, 48);
  }
  function score(item, query, tokens) {
    const title = normalize(item.title);
    const doc = normalize(item.document);
    const body = normalize(item.text);
    let rank = 0;
    for (const word of tokens) {
      const boost = word.length > 2 ? 1.8 : 0.65;
      if (title.includes(word)) rank += 7 * boost;
      if (doc.includes(word)) rank += 4 * boost;
      if (body.includes(word)) rank += 1.8 * boost;
    }
    const q = normalize(query).replace(/\s+/g, "");
    if (q.length >= 2 && (title.includes(q) || body.includes(q))) rank += 20;
    return rank;
  }
  async function loadRegulations() {
    if (regulations) return regulations;
    if (loading) return loading;
    loading = (async () => {
      const response = await fetch("regulations-full.html", { cache: "no-cache" });
      if (!response.ok) throw new Error("Could not read official regulations");
      const dom = new DOMParser().parseFromString(await response.text(), "text/html");
      const items = [];
      for (const section of dom.querySelectorAll("section.regulation")) {
        const match = /^doc([1-7])$/.exec(section.id);
        if (!match) continue;
        const no = Number(match[1]);
        const documentName = section.querySelector("h2")?.textContent?.trim() || documentLabels[no];
        const textContainer = section.querySelector(".document-text");
        if (!textContainer) continue;
        for (const heading of textContainer.querySelectorAll("h4.article[id]")) {
          let cursor = heading.nextElementSibling;
          const parts = [];
          while (cursor && !cursor.matches("h4.article")) {
            if (cursor.matches("p,li,h3,h5,div.searchable")) {
              const text = cursor.textContent.trim();
              if (text) parts.push(text);
            }
            cursor = cursor.nextElementSibling;
          }
          if (!/^doc[1-7]-article-\d+$/.test(heading.id)) continue;
          items.push({
            id: heading.id,
            document: documentName,
            title: heading.textContent.trim(),
            text: parts.join("\n").slice(0, 4200),
            href: "regulations-full.html?lang=ja#" + heading.id
          });
        }
      }
      if (items.length < 100 || new Set(items.map((x) => x.id)).size !== items.length) {
        throw new Error("Regulations index is incomplete");
      }
      regulations = items;
      return items;
    })();
    try { return await loading; } finally { loading = null; }
  }
  function addMessage(type, text) {
    const box = document.createElement("div");
    box.className = "mjx-ai-message mjx-ai-message--" + type;
    const p = document.createElement("p");
    p.textContent = text;
    box.appendChild(p);
    historyBox.appendChild(box);
    historyBox.scrollTop = historyBox.scrollHeight;
    return box;
  }
  function addSources(box, citations, isSearch) {
    const wrap = document.createElement("div");
    wrap.className = "mjx-ai-citations";
    const strong = document.createElement("strong");
    strong.textContent = isSearch ? label("関連する条文（検索結果）", "Relevant clauses (search results)") : label("参照した条文", "Source clauses");
    wrap.appendChild(strong);
    const list = document.createElement("ol");
    for (const citation of citations.slice(0, 6)) {
      if (!/^doc[1-7]-article-\d+$/.test(citation.id || "")) continue;
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = "regulations-full.html?lang=ja#" + citation.id;
      link.textContent = citation.document + " — " + citation.title;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      li.appendChild(link);
      if (isSearch && citation.text) {
        const excerpt = document.createElement("span");
        excerpt.className = "mjx-ai-snippet";
        excerpt.textContent = citation.text.slice(0, 400) + (citation.text.length > 400 ? "…" : "");
        li.appendChild(excerpt);
      }
      list.appendChild(li);
    }
    wrap.appendChild(list);
    box.appendChild(wrap);
  }
  function search(items, query) {
    const tokens = queryWords(query);
    return items.map((item) => ({ ...item, rank: score(item, query, tokens) }))
      .filter((item) => item.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 6);
  }
  async function fallback(query, reason) {
    try {
      const items = await loadRegulations();
      const citations = search(items, query);
      if (!citations.length) {
        addMessage("assistant", label("該当する条文を見つけられませんでした。別の言い方で質問するか、公式規定全文を確認してください。", "No matching clauses found. Try rephrasing the question or check the full regulations."));
        return;
      }
      const opening = endpoint && reason
        ? label("AIに接続できなかったため、条文検索の結果を表示します。", "AI is unavailable, so these are clause-search results.")
        : label("質問に関連する可能性がある条文です。解釈や判断ではなく、原文への案内として確認してください。", "These clauses may be relevant. These are search matches, not an interpretation or decision.");
      addSources(addMessage("assistant", opening), citations, true);
    } catch (_) {
      addMessage("assistant", label("現在、公式規定を取得できません。通信状態を確認して再試行してください。", "Unable to load the official regulations right now. Check your connection and try again."));
    }
  }
  async function askAI(query) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: query, lang }),
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error("AI request failed");
    const data = await response.json();
    if (!data || typeof data.answer !== "string" || data.answer.length > 5000 || !Array.isArray(data.citations)) {
      throw new Error("Invalid AI response");
    }
    const citations = data.citations.filter((x) => x && typeof x.id === "string" && /^doc[1-7]-article-\d+$/.test(x.id));
    const message = addMessage("assistant", data.answer);
    if (citations.length) addSources(message, citations, false);
  }
  for (const el of document.querySelectorAll("[data-ja][data-en]")) {
    el.textContent = el.dataset[lang];
  }
  for (const el of document.querySelectorAll("[data-example-ja][data-example-en]")) {
    el.textContent = el.dataset["example" + (english ? "En" : "Ja")];
    el.addEventListener("click", () => { input.value = el.textContent; input.focus(); });
  }
  input.placeholder = label("例：ビジターでもブロックを設置できますか？", "e.g. Can visitors place blocks?");
  status.textContent = endpoint ? label("AI回答 + 根拠条文", "AI answers with citations") : label("公式条文検索モード", "Official clause search mode");
  if (endpoint) status.parentElement.classList.add("mjx-ai-mode--connected");
  hint.textContent = endpoint
    ? label("AIの回答には誤りが含まれる場合があります。重要な判断は原文で確認してください。", "AI may make mistakes. Confirm important decisions in the original text.")
    : label("AIの接続設定がないため、現在は条文検索として動作します。", "AI is not connected yet; clause search is available.");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const question = input.value.trim().slice(0, 400);
    if (!question) return;
    input.value = "";
    addMessage("user", question);
    submit.disabled = true;
    hint.textContent = label("公式規定を確認しています…", "Checking the official regulations…");
    try {
      if (endpoint) {
        try { await askAI(question); }
        catch (_) { await fallback(question, true); }
      } else {
        await fallback(question, false);
      }
    } finally {
      submit.disabled = false;
      hint.textContent = endpoint
        ? label("回答の根拠となる条文を必ず確認してください。", "Always check cited clauses.")
        : label("関連条文の一覧から原文を確認できます。", "Open the linked clauses to read the original text.");
      input.focus();
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  loadRegulations().catch(() => { /* Loading can be retried by submitting a question. */ });
})();
