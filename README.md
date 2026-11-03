# MTR Japan Nexus — MJX公式サイト

MJX公式の案内サイト。日本語・英語のホーム、紹介、公式規定一覧を公開します。

## 現在の配布方式（2026-11-02）
- **規定はHTMLで全文閲覧**します。日本語の全文は `regulations.html`、英語の参考要約は `regulations-en.html`。
- `regulations.html` はユーザー提供の `MJX_全7規定_完全文字化_2026-11-01(1).html` をベースにし、7規定の本文を保ったままサイトナビ・検索・章条リンクを追加しています。
- 個別規定の直接リンクは `regulations.html?lang=ja#doc1` ～ `#doc7`。章条リンクは `#doc3-article-19` 形式です。
- 公式7規定は **2026-11-01施行**。④リソースパック統一規約、⑤プライバシーポリシー、⑦ビジター向けルールの改訂・修正版も同日から適用します。制定日・承認日は履歴として維持します。
- ②共通規定と③Builder規定は画像ページからOCRで文字化されており、**誤認識の可能性があります**。引用・改訂前には人手で原本照合してください。
- Webサイトの公開ナビではPDFリンクを使用しません。旧PDFと生成用スクリプトはGitHubに作業履歴として残し、新しい規定ページからは案内しません。
- 英語ページは**非公式の参考要約**であり、全文翻訳ではありません。ボタンは日本語HTML全文の各規定に移動します。

## ページ
| ファイル | 役割 |
|---|---|
| `index.html` / `index-en.html` | 日英ポータル |
| `regulations.html` | 全7規定の日本語全文・検索・章条リンク |
| `regulations-en.html` | 7規定の英語参考要約・日本語全文へのリンク |
| `jp.html` / `en.html` | MJXの紹介（日英） |
| `home.html` | Flask/Jinja用ホームページテンプレート（GitHub Pagesで直接レンダリングされない） |
| `mjx-theme.css` | 共通ヘッダー、フッター、アイコン等のスタイル |
| `mjx-lang.js` | 言語設定・ページの切り替え |
| `assets/mjx-logo-original.png` | 元の構図を保った公式ロゴ |

## 更新時の注意
条文は文書①〜⑦の各セクションで管理。規定の制定・改訂と、改訂の**施行**は区別してください。規定本文を書き換える際は、承認済みの改定内容、施行日、既存条文との整合を確認してください。検索・記事見出し・各 `id` は壊さないようにしてください。

## 2026-11-02: 入口を従来のカード式一覧に戻す
- `regulations.html`：従来の7規定カード・要約・施行状況・検索とフィルターを使った入口。
- `regulations-full.html`：ユーザー提供の全文HTML（7規定・130条文見出し）をそのまま保持。入口の「全文を読む」は `#doc1` ～ `#doc7` に移動する。
- `regulations-en.html`：英語の要約入口。日本語全文へのリンク先は `regulations-full.html`。
- 公式サイトの閲覧導線からPDFを外す。旧PDFはリポジトリ内に履歴として残す。
- 過去のPDF自動生成ワークフローは自動実行を停止（手動実行のみ）。現行運用のHTMLはPDF生成処理の対象外とする。
- 公式7規定は2026年11月1日施行。④⑤⑦の改訂・修正版も施行中。②③のOCR誤認識は校正待ち。

## Full English regulation pages
- English overview: `regulations-en.html` (seven original-style cards).
- `regulations-full-en.html` is built from `regulations-full.html` by Argos Translate Japanese-to-English. Original IDs/paragraph counts are checked.
- **English is an unreviewed reference translation, not official regulation text.** Japanese wording controls. Regulations 02/03 may contain source OCR inaccuracies.
- All seven regulations, including revisions 04/05/07, took effect November 1, 2026.
- The English full-text generator is bootstrapped from verified source chunks under `scripts/bootstrap_en_part*.txt` (checksum enforced), then written as `scripts/generate_english_regulations.py` for maintainability.

## サイトの役割と検索エンジン対応（2026-11-02）
- このGitHub Pagesサイトは、MJXの総合的な公式ホームページではなく、**公式ルールブック・案内サイト**です。公式7規定の原文・英語参考訳・MJXの説明への入口として運用します。
- 日英の各ページに自己参照の `canonical` と相互の `hreflang` を付け、`sitemap.xml` に検索対象の8ページを掲載します。
- 公開URL: https://warudora.github.io/MJX-/
- Google Search Consoleには `https://warudora.github.io/MJX-/sitemap.xml` を登録し、公開後のインデックス状況を確認してください。サイトマップは検索順位やインデックス登録を保証しません。
- Discord公式招待リンクは **https://discord.gg/PehjWyGDHV** （運営提供URL）。日本語・英語の各ページのナビ・フッターとトップページ等の参加ボタンから案内します。
- GitHub Pagesは `warudora.github.io` のサブパスで公開されるため、`/MJX-/robots.txt` を配置してもドメインルートのrobots.txtの代替にはなりません。

## 2026-11-03: 公式7規定の施行日統一

- MJX運営の指示により公式7規定すべての施行日を **2026-11-01** に統一。④⑤⑦の改訂・修正版も同日施行。
- 過去の制定日・承認日は区別して保持。適用上の基準は `regulations-full.html` および対応する規定一覧とし、英語版は参考訳。
- `regulations/source-original/` および既存PDFは以前の配布時点の原資料・スナップショットであり、今回の施行日修正を反映しない場合があるため、**最新の施行状況と条文はHTML版を確認すること**。
