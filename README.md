# MJX公式案内サイト — MTR Japan Nexus

2026年11月1日承認の「公式7規定」と、MTR Japan Nexusの成り立ちを公開するリポジトリ。

## ページとスタイル
| ファイル | 役割 | CSSの管理 |
| --- | --- | --- |
| `index.html` | 公式ポータル | `mjx-theme.css` のポータル専用部分 |
| `regulations.html` | 公式7規定の目次・適用状況・全文PDFリンク | ページ内の規定一覧専用CSS + `mjx-theme.css` の共通ナビ |
| `jp.html` | MJXの成り立ち・コンセプト・最後に（日本語） | ページ内に独立した専用CSS |
| `en.html` | 上記の英語参考版 | ページ内に独立した専用CSS |
| `home.html` | Flask/Jinja動的ホーム用テンプレート | ページ内の専用CSS。Jinja変数とJSを保持 |
| `mjx-theme.css` | 公式ポータルと規定一覧の共通ナビ・基本デザイン | **旧参加ガイド／ホーム専用スタイルを含めない** |

`home.html` はJinja用テンプレートであり、そのままGitHub Pages上で動的表示する設計ではありません。

## 公式7規定（2026-11-01承認版）
| No. | 規定 | 表示する状態 | PDF |
| --- | --- | --- | --- |
| 01 | 映画館システム利用ポリシー | 現行・原文維持 | `regulations/fulltext/01-cinema-policy.pdf` |
| 02 | 共通サーバー規定 | 現行・原文維持 | `regulations/fulltext/02-general-server-rules.pdf` |
| 03 | Builder規定 | 現行・原文維持 | `regulations/fulltext/03-builder-regulations.pdf` |
| 04 | リソースパック統一規約 | 改訂承認済み・施行日未指定 | `regulations/fulltext/04-resource-pack-rules.pdf` |
| 05 | プライバシーポリシー | 改訂承認済み・施行日未指定 | `regulations/fulltext/05-privacy-policy.pdf` |
| 06 | 経済規定 | 現行・原文維持 | `regulations/fulltext/06-economic-regulations.pdf` |
| 07 | ビジター向けルール | 改訂承認済み・施行日未指定 | `regulations/fulltext/07-visitor-rules.pdf` |

`regulations.html` は条文の要約・適用状況の案内。正式な判断には各PDFの原文と運営の施行告知を参照。承認日をもって④⑤⑦の改訂版が施行されたと扱わないこと。

## UI管理・チェック
- 静的ページは相対リンクで移動し、公式7規定から原本PDF7件を直接開ける。
- 共通スタイルはポータルと規定一覧だけが読み込む。日英紹介ページとFlaskホームは独立したCSS。
- PC・タブレット・スマホ用のブレークポイント、キーボードフォーカス、44px級のタップ領域を考慮。
- `index.html` / `regulations.html` で共通CSSを編集した際は、配信キャッシュを避けるため両方のリンクに同じ更新番号を付ける。
- GitHubファイル整合性の検査はブラウザ描画・実運用中のFlask/Jinja検証の代わりにはならない。

## 全ページの日英切替 (2026-11-01)
- 日本語トップ: `index.html` → 英語トップ: `index-en.html`
- 日本語の規定一覧: `regulations.html` → 英語の規定概要: `regulations-en.html`
- MJX紹介: `jp.html` → `en.html`
- `mjx-lang.js` が言語選択を `localStorage` に保存し、保存済みの英語設定で日本語URLにアクセスした場合は該当英語ページへ移動する。各ページ内のナビゲーションも言語別URLに統一。
- 英語の規定ページは**説明用の非公式英訳**。7件の全文PDFは日本語原本であり、施行状況や法的判断は原本と運営発表を優先する。
- `home.html`（Flask/Jinja）は `?lang=en` で固定UIの英語表示を切り替える。ナビ/ニュース/ミッション/記事の動的な日本語データは、英語フィールド `name_en`, `title_en`, `tag_en`, `desc_en`, `status_en`, `summary_en` をバックエンド側で渡せば英語が優先され、なければ元データにフォールバックする。
- Flask配下のほかの動的ページ（参加方法・記事詳細など）はこのリポジトリにHTMLが存在しないため、本変更だけでは自動翻訳しない。

## 2026-11-01: 言語切り替えの双方向保証
- すべての公開静的ページで「日本語 / English」を常時表示する。現在の言語はマゼンタの選択状態で示す。
- 日本語→英語、英語→日本語の両方向を `mjx-lang.js` が同一ルールで処理し、選択を `localStorage` に保存する。
- URLに `?lang=ja` / `?lang=en` が指定された場合はその指定を最優先する。これにより保存済みの逆の言語からでも明示的に切り替えられる。
- PC・タブレット・スマホの言語スイッチはナビゲーションより先に配置し、狭い画面でも常に見えるようにする。
- Flaskの`home.html`は`?lang=ja`/`?lang=en`に対応。動的データは英語フィールドが提供された場合に翻訳表示し、なければ原語になる。
- 日本語原文PDFとリポジトリ外のFlaskテンプレートは変更していないため、PDF本文や未登録の外部ページが自動翻訳されるわけではない。
