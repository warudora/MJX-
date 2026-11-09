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
    ["違反", "禁止", "処分", "異議", "ban", "appeal"],
    ["参加方法", "参加", "入り方", "接続", "マルチプレイ", "join", "connect"],
    ["modパック", "modpack", "ダウンロード", "zip", "インポート"],
    ["prism launcher", "prism", "ランチャー", "起動構成"],
    ["discord", "サーバーステータス", "/start", "接続アドレス"],
    ["mgsa", "mcp", "共通試験", "ビルダー試験", "資格", "免除"],
    ["mjas", "mtts", "jnc", "統合", "成り立ち", "コミュニティ"],
    ["問い合わせ", "トラブル", "エラー", "起動しない", "接続できない"]
  ];
  let regulations = null;
  let loading = null;
  const conversation = [];
  function normalize(text) {
    return String(text || "").normalize("NFKC").toLocaleLowerCase("ja").replace(/\s+/g, " ");
  }
  function queryWords(text) {
    let query = normalize(text).replace(/できますか|してもいい|について|教えて|どうすれば|何ですか|どこですか|ありますか|でしょうか|できます|したい|のですか|ですか|は|が|を|に|で|の|も|か|？|\?/g, " ");
    const words = query.split(/[\s、。,.!！:：]+/).filter((word) => word.length >= 2);
    const set = new Set(words);
    for (const w of words) {
      if (w.length > 2 && !/^[a-z0-9]+$/.test(w)) {
        for (let i = 0; i < w.length - 1; i += 1) set.add(w.slice(i, i + 2));
      }
    }
    for (const group of aliases) {
      if (group.some((w) => normalize(text).includes(normalize(w)))) {
        for (const w of group) set.add(normalize(w));
      }
    }
    return [...set].filter((w) => w.length >= 2).slice(0, 48);
  }
  function matchesTerm(text, term) {
    // Short Latin terms must match entire words, not "hi" inside "architecture".
    if (/^[a-z0-9]{2}$/.test(term)) {
      return new RegExp("(^|[^a-z0-9])" + term + "($|[^a-z0-9])").test(text);
    }
    return text.includes(term);
  }
  function score(item, query, tokens) {
    const title = normalize(item.title);
    const doc = normalize(item.document);
    const body = normalize(item.text);
    let rank = 0;
    for (const word of tokens) {
      const boost = word.length > 2 ? 1.8 : 0.65;
      if (matchesTerm(title, word)) rank += 7 * boost;
      if (matchesTerm(doc, word)) rank += 4 * boost;
      if (matchesTerm(body, word)) rank += 1.8 * boost;
    }
    const q = normalize(query).replace(/\s+/g, "");
    if (q.length >= 2 && (matchesTerm(title, q) || matchesTerm(body, q))) rank += 20;
      const sourceNumber = Number(/^doc([1-7])-/.exec(item.id)?.[1] || 0);
    const topics = [
      [/ビジター|visitor/i, 3], [/ビルダー|builder/i, 2],
      [/映画館|上映|cinema|screening/i, 6],
      [/プライバシー|個人情報|保存期間|privacy|retention/i, 7],
      [/経済|通貨|運賃|economy|money/i, 4],
      [/リソースパック|resource.pack/i, 5],
      [/共通規定|共通サーバー|general.server/i, 1]
    ];
    for (const [pattern, number] of topics) {
      if (pattern.test(query) && sourceNumber === number) rank += 40;
    }
    return rank + (window.MJXSiteIndex?.scoreBoost(item, query) || 0);
  }
  async function loadRegulations() {
    if (regulations) return regulations;
    if (loading) return loading;
    loading = (async () => {
      const response = await fetch("regulations-full.html", { cache: "no-cache", signal: AbortSignal.timeout(15000) });
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
    box.className = "mjx-ai-message mjx-ai-message--" + type + " mjx-ai-message--fresh";
    const p = document.createElement("p");
    p.textContent = text;
    box.appendChild(p);
    historyBox.appendChild(box);
    historyBox.scrollTop = historyBox.scrollHeight;
    return box;
  }
  function showThinking() {
    const box = document.createElement("div");
    box.className = "mjx-ai-message mjx-ai-message--assistant mjx-ai-message--thinking mjx-ai-message--fresh";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    const heading = document.createElement("div");
    heading.className = "mjx-ai-thinking-heading";
    const dots = document.createElement("span");
    dots.className = "mjx-ai-thinking-dots";
    dots.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 3; i += 1) dots.appendChild(document.createElement("span"));
    const title = document.createElement("strong");
    title.textContent = label("考え中…", "Thinking…");
    heading.append(dots, title);
    const detail = document.createElement("p");
    detail.className = "mjx-ai-thinking-detail";
    detail.textContent = endpoint
      ? label("公式サイトの情報を確認して回答を準備しています。", "Reviewing the official website and preparing an answer.")
      : label("公式サイト内を検索しています。", "Searching the official website.");
    box.append(heading, detail);
    historyBox.appendChild(box);
    historyBox.scrollTop = historyBox.scrollHeight;
    return { box, detail };
  }
  function addSources(box, citations, isSearch) {
    const valid = citations.filter((citation) =>
      citation && typeof citation.id === "string" && window.MJXSiteIndex?.href(citation.id)
    ).slice(0, 8);
    if (!valid.length) return;
    const wrap = document.createElement("div");
    wrap.className = "mjx-ai-citations";
    const strong = document.createElement("strong");
    strong.textContent = isSearch
      ? label("関連する公式ページ・条文", "Related official pages and clauses")
      : label("参照した公式ページ・条文", "Official sources and clauses");
    wrap.appendChild(strong);

    function createCitation(citation, index) {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = window.MJXSiteIndex.href(citation.id);
      link.textContent = citation.document + " — " + citation.title;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      li.appendChild(link);

      if (isSearch && citation.text) {
        const excerptText = citation.text.slice(0, 400) +
          (citation.text.length > 400 ? "…" : "");
        if (index === 0) {
          const excerpt = document.createElement("p");
          excerpt.className = "mjx-ai-top-excerpt";
          excerpt.textContent = citation.text.slice(0, 185) +
            (citation.text.length > 185 ? "…" : "");
          li.appendChild(excerpt);
        } else {
          const disclosure = document.createElement("details");
          disclosure.className = "mjx-ai-excerpt-toggle";
          const summary = document.createElement("summary");
          summary.textContent = label("条文の抜粋を読む", "Read clause excerpt");
          const excerpt = document.createElement("span");
          excerpt.className = "mjx-ai-snippet";
          excerpt.textContent = excerptText;
          disclosure.append(summary, excerpt);
          li.appendChild(disclosure);
        }
      }
      return li;
    }

    const primary = document.createElement("ul");
    primary.className = "mjx-ai-source-list";
    valid.slice(0, 3).forEach((citation, index) => {
      primary.appendChild(createCitation(citation, index));
    });
    wrap.appendChild(primary);

    if (valid.length > 3) {
      const extra = document.createElement("details");
      extra.className = "mjx-ai-more-sources";
      const summary = document.createElement("summary");
      summary.textContent = label(
        "ほか" + (valid.length - 3) + "件の条文も表示",
        "Show " + (valid.length - 3) + " more clauses"
      );
      const list = document.createElement("ul");
      list.className = "mjx-ai-source-list";
      valid.slice(3).forEach((citation, index) => {
        list.appendChild(createCitation(citation, index + 3));
      });
      extra.append(summary, list);
      wrap.appendChild(extra);
    }
    box.appendChild(wrap);
  }
  function search(items, query) {
    if (/規定一覧|7規定|七規定|7つの規定|all.*regulations|list.*rules/i.test(query)) {
      const overview = items.filter((item) => /^overview-[1-7]$/.test(item.id));
      if (overview.length === 7) return overview;
    }
    if (/参加方法|参加手順|参加したい|how to join|steps to join/i.test(query)) {
      const steps = items.filter((item) => item.id === "join-early" || /^join-step-0[1-7]$/.test(item.id));
      if (steps.length === 8) return steps;
    }
    const tokens = queryWords(query);
    return items.map((item) => ({ ...item, rank: score(item, query, tokens) }))
      .filter((item) => item.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 7);
  }
  async function fallback(query, reason) {
    try {
      const items = window.MJXSiteIndex ? await window.MJXSiteIndex.load(loadRegulations) : await loadRegulations();
      const citations = search(items, query);
      if (!citations.length) {
        const message = /^(hi|hello|hey|こんにちは|やあ|おはよう|こんばんは)[！!。\s]*$/i.test(query)
          ? label("こんにちは！MJXの参加方法や規定について質問できます。", "Hello! You can ask about joining MJX or its regulations.")
          : label("関連する公式ページが見つかりませんでした。質問を言い換えるか、公式サイトを確認してください。", "No matching official pages found. Try rephrasing your question or explore the website.");
        addMessage("assistant", endpoint && reason ? reason + "\n" + message : message);
        return;
      }
      const opening = endpoint && reason
        ? reason
        : label("質問に関連する公式ページです。検索結果は正式な判断ではないため、本文をご確認ください。", "These official pages may be relevant. Search results are not authoritative decisions.");
      addSources(addMessage("assistant", opening), citations, true);
    } catch (_) {
      addMessage("assistant", label("現在、公式サイトの情報を取得できません。通信状態を確認して再試行してください。", "Unable to load the official site information. Check your connection and try again."));
    }
  }
  async function requestAI(query) {
    const startedAt = performance.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);
    let stage = "request";
    let response = null;
    let providerReason = "";
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: query, lang, history: conversation.slice(-6) }),
        signal: controller.signal
      });
      stage = "http_response";
      if (!response.ok) {
        const diagnostic = await response.json().catch(() => null);
        providerReason = typeof diagnostic?.reason === "string" ? diagnostic.reason : "";
        throw new Error("AI HTTP request failed");
      }
      stage = "parse_response";
      const data = await response.json();
      if (!data || data.source_scope !== "mjx-site-v2" ||
          typeof data.answer !== "string" || !data.answer.trim() ||
          data.answer.length > 5000 || !Array.isArray(data.citations)) {
        throw new Error("AI returned an invalid response");
      }
      return data;
    } catch (cause) {
      const error = new Error("MJX AI request failed");
      error.name = controller.signal.aborted ? "TimeoutError" : "AIRequestError";
      error.status = response?.status || 0;
      error.reason = controller.signal.aborted
        ? "ai_timeout"
        : providerReason || (error.status
          ? (error.status === 429 ? "rate_limit" : "http_error")
          : stage === "request" ? "browser_network" : "invalid_response");
      error.stage = stage;
      error.elapsedMs = Math.max(0, Math.round(performance.now() - startedAt));
      // Never log the user's question or AI answer.
      console.warn("[MJX AI] request", {
        stage: error.stage, reason: error.reason, status: error.status, elapsedMs: error.elapsedMs,
        causeName: String(cause?.name || "Error")
      });
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  async function askAI(query) {
    const data = await requestAI(query);
    let message;
    try {
      message = addMessage("assistant", data.answer);
      updateAIState("connected");
      conversation.push(
        { role: "user", content: query.slice(0, 400) },
        { role: "assistant", content: data.answer.slice(0, 500) }
      );
      if (conversation.length > 12) conversation.splice(0, conversation.length - 12);
    } catch (_) {
      const error = new Error("AI reply display failed");
      error.reason = "client_render";
      throw error;
    }
    // Source-link rendering is optional; it must never reclassify a valid AI reply as a connection failure.
    try {
      const citations = data.citations.filter((x) =>
        x && typeof x.id === "string" && window.MJXSiteIndex?.href(x.id)
      );
      if (citations.length) addSources(message, citations, false);
    } catch (_) {
      console.warn("[MJX AI] citations could not be rendered");
    }
  }
  for (const el of document.querySelectorAll("[data-ja][data-en]")) {
    el.textContent = el.dataset[lang];
  }
  for (const el of document.querySelectorAll("[data-example-ja][data-example-en]")) {
    el.textContent = el.dataset["example" + (english ? "En" : "Ja")];
    el.addEventListener("click", () => {
      if (submit.disabled) return;
      input.value = el.textContent;
      $("mjx-ai-faq")?.removeAttribute("open");
      $("mjx-ai-tools")?.removeAttribute("open");
      form.requestSubmit();
    });
  }
  input.placeholder = label("例：MJXにはどうやって参加するの？", "e.g. How can I join MJX?");
  function updateAIState(state, error = null) {
    status.parentElement.classList.toggle("mjx-ai-mode--connected", state === "connected");
    if (state === "connected") {
      status.textContent = label("AI応答正常", "AI responding");
    } else if (state === "offline") {
      status.textContent = error?.reason === "browser_network"
        ? label("AI通信失敗・サイト内検索", "AI network failed · site search")
        : error?.reason === "invalid_response"
          ? label("AI回答形式エラー・サイト内検索", "AI format error · site search")
          : error?.reason === "client_render"
            ? label("AI表示エラー・サイト内検索", "AI display error · site search")
            : error?.reason === "ai_quota"
              ? label("AI利用上限・サイト内検索", "AI quota reached · site search")
              : error?.reason === "visitor_rate_limit" || error?.reason === "rate_limit"
                ? label("AI利用制限・サイト内検索", "AI rate limited · site search")
                : label("AI一時利用不可・サイト内検索", "AI unavailable · site search");
    } else {
      status.textContent = state === "pending"
        ? label("AI応答待機中…", "Waiting for AI response…")
        : endpoint
          ? label("AI接続確認前", "AI connection not yet checked")
          : label("公式サイト内検索モード", "Official website search mode");
    }
  }
  function aiFailureNotice(error) {
    if (error?.reason === "client_render") return label("AIから回答は届きましたが、画面に表示できませんでした。サイト内検索に切り替えます。", "The AI answered, but the page could not display it. Switching to site search.");
    if (error?.reason === "browser_network") return label("ブラウザからAIへの通信に失敗しました。ネットワークやSafariのコンテンツブロッカーをご確認ください。公式サイト内検索に切り替えます。", "The browser could not reach AI. Check your connection or content blockers. Switching to site search.");
    if (error?.reason === "invalid_response") return label("AIから受信した回答データを処理できませんでした。公式サイト内検索に切り替えます。", "The AI response format could not be processed. Switching to site search.");
    if (error?.reason === "ai_quota") return label("AIサービスの利用枠に達したため、公式サイト内検索へ切り替えました。", "The AI service has reached its usage quota. Showing official site search results.");
    if (error?.reason === "ai_capacity") return label("AIモデル側が混雑しているため、公式サイト内検索へ切り替えました。", "The AI model is temporarily busy. Showing official site search results.");
    if (error?.reason === "visitor_rate_limit") return label("短時間のAI利用制限に達したため、公式サイト内検索へ切り替えました。", "The AI request rate limit was reached. Showing official site search results.");
    if (error?.reason === "ai_binding" || error?.reason === "limit_service") return label("AIサービスの設定または接続に問題があるため、公式サイト内検索へ切り替えました。", "The AI service is not correctly configured or connected. Showing official site search results.");
    if (error?.reason === "ai_timeout" || error?.name === "TimeoutError" || error?.name === "AbortError") return label("AIの応答が時間内に届かなかったため、公式サイト内検索へ切り替えました。", "The AI response timed out. Showing official site search results.");
    if (error?.status === 403) return label("AIへのアクセスが拒否されたため、公式サイト内検索へ切り替えました。", "Access to AI was denied. Showing official site search results.");
    if (error?.status === 429) return label("AIへのアクセスが制限されたため、公式サイト内検索へ切り替えました。", "AI access was rate limited. Showing official site search results.");
    return label("AIが一時的に利用できないため、公式サイト内検索へ切り替えました。", "AI is temporarily unavailable. Showing official site search results.");
  }
  function failureDiagnostic(error) {
    const kind = error?.reason === "browser_network" ? "NETWORK"
      : error?.reason === "invalid_response" ? "RESPONSE"
      : error?.reason === "client_render" ? "DISPLAY"
      : error?.reason === "ai_timeout" ? "TIMEOUT"
      : error?.status ? "HTTP " + error.status : "UNKNOWN";
    const seconds = typeof error?.elapsedMs === "number"
      ? (error.elapsedMs / 1000).toFixed(1) + "s"
      : "-";
    return label("診断", "Diagnostic") + ": " + kind + " / " + seconds;
  }
  updateAIState("idle");
  hint.textContent = endpoint
    ? label("AIの回答には誤りが含まれる場合があります。重要な判断は原文で確認してください。", "AI may make mistakes. Confirm important decisions in the original text.")
    : label("AIの接続設定がないため、公式サイト内検索でご案内します。", "AI is not connected; official website search is available.");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const question = input.value.trim().slice(0, 400);
    if (!question) return;
    input.value = "";
    $("mjx-ai-tools")?.removeAttribute("open");
    $("mjx-ai-faq")?.removeAttribute("open");
    addMessage("user", question);
    submit.disabled = true;
    submit.textContent = label("考え中…", "Thinking…");
    form.setAttribute("aria-busy", "true");
    const thinking = showThinking();
    hint.textContent = label("考え中… 公式サイトを確認しています。", "Thinking… Reviewing the official site.");
    try {
      if (endpoint) {
        updateAIState("pending");
        try { await askAI(question); }
        catch (error) {
          updateAIState("offline", error);
          const notice = aiFailureNotice(error) + "
" + failureDiagnostic(error);
          thinking.detail.textContent = notice;
          await fallback(question, notice);
        }
      } else {
        await fallback(question, false);
      }
    } finally {
      thinking.box.remove();
      submit.disabled = false;
      submit.textContent = label("送信", "Send");
      form.removeAttribute("aria-busy");
      hint.textContent = endpoint && status.parentElement.classList.contains("mjx-ai-mode--connected")
        ? label("回答の根拠となる条文を必ず確認してください。", "Always check cited clauses.")
        : label("検索結果のリンクから公式ページを確認できます。", "Open the official pages linked in the results.");
      input.focus();
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  if (window.self !== window.top && new URLSearchParams(location.search).get("embed") === "1") {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        window.parent.postMessage({ type: "mjx-rule-ai-close" }, window.location.origin);
      }
    });
  }
  (window.MJXSiteIndex ? window.MJXSiteIndex.load(loadRegulations) : loadRegulations()).catch(() => { /* Retry on submission. */ });
})();
