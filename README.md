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

## 2026-11-01: 言語保持の強化
- ホーム・公式7規定・MJXについての日英6ページは、内部リンクに `?lang=ja` / `?lang=en` を明示し、ブラウザの保存設定やクリックイベントが動かなくても言語を指定できるようにした。
- 双方向の言語切り替えとページ移動の設定は `mjx-lang.js` で維持。原本PDF7件は日本語のまま。

## 2026-11-01: ヘッダーの右寄せ修正
- 言語選択UI追加後、3要素に対する `justify-content: space-between` でナビが中央に動いたため、ロゴ左・ナビ＋言語切替右の配置に修正。
- 静的ポータル／規定、独立した日英紹介ページ、Flaskホームのすべてで同じ右寄せ方針。
- タブレット／スマートフォンは言語切替を右上、ナビを次の行に配置。リンクが短い場合は右寄せ、長い場合は横スクロールで操作できる。
- CSSキャッシュ対策として静的4ページのバージョン文字列を更新。

## 2026-11-01: 数字表示の撤去・ページ上部へ戻る
- トップの装飾的な「07 / 04 / 03」は押せるUIではなく誤解を招くため日英両ページから削除。
- 規定一覧のヒーローにあった同じ統計表示も日英から撤去。承認・施行状態の文章と7規定の一覧・PDFリンクは維持。
- すべての公開HTML（index/index-en、regulations/regulations-en、jp/en）とFlask/Jinjaホームに、ページ上部へ戻る固定リンクを追加。通常の `href="#page-top"` で動作するため、JavaScriptが無効でも利用可能。
- スマホでは丸い矢印、広い画面では「↑ 上へ / ↑ Top」と表示。iOSセーフエリア、キーボード操作、動きを減らす設定、印刷時の非表示に対応。

## English reference PDFs (2026-11-01)
The seven English summaries are kept as **separate reference PDFs**, not as translations of every provision. Use the original Japanese PDFs for the complete terms and official wording.

- Combined: `regulations/english/MJX-seven-regulations-english-reference-guide.pdf`
- 01 Cinema System Usage Policy: `regulations/english/01-01-cinema-policy-summary-en.pdf`
- 02 General Server Regulations: `regulations/english/02-02-general-server-rules-summary-en.pdf`
- 03 Builder Regulations: `regulations/english/03-03-builder-regulations-summary-en.pdf`
- 04 Resource Pack Regulations: `regulations/english/04-04-resource-pack-rules-summary-en.pdf`
- 05 Privacy Policy: `regulations/english/05-05-privacy-policy-summary-en.pdf`
- 06 Economic Regulations: `regulations/english/06-06-economic-regulations-summary-en.pdf`
- 07 Visitor Rules: `regulations/english/07-07-visitor-rules-summary-en.pdf`

The English regulations page shows both the Japanese original PDF and its English reference summary PDF. Revisions 04, 05, and 07 remain **approved but without announced effective dates**. Complete, clause-by-clause certified English translations have not been produced; the scanned original pages require additional verification before such translations could be published.

## 右下ロゴの欠け修正（2026-11-01）
- 不完全なロゴの原因は、PDF再生成処理のロゴ切り出し範囲（元画像の右側を欠落させる位置）にあった。
- 元の50ページ承認版PDFは `regulations/source-original/` に保管し、毎回そこから55ページ版を再構成する。
- ロゴのXマークと文字列全体を含む画像範囲へ変更し、7規定の最終ページのみ右下安全領域に配置。
- 公開更新前のGitHub Actionsで7箇所をPDFレンダリングし、ロゴ画素数と上下左右の余白を検査する。

## Searchable PDFs and page numbering (November 1, 2026)
- The official Japanese PDF originals remain archived under `regulations/source-original/`.
- The published 55-page PDF has sequential page numbers (including seven cover pages), plus PDF bookmarks for all seven regulations.
- The 14 image-only pages of General Server Rules and Builder Regulations gain a Tesseract OCR **search layer**. The visible printed Japanese provisions are not changed.
- **OCR results have not been proofread**; copied/search text may contain recognition errors and must not substitute for the visible original when interpreting regulations.
- The workflow runs `scripts/make_mjx_searchable.py` after the layout generator, then publishes the split PDF files and validates all 55 page labels, OCR layers, and logo margins.

## 2026-11-01: 49–51・54–55ページの改ページ修正
- 経済規定の第38条第5項と第42条第3項が孤立しないよう、それぞれ49・50ページにまとめる。
- ビジター規定の「2. お金の稼ぎ方」の見出しと内容を54ページにまとめ、55ページは「3. お金の使い道」から始める。
- PDF本文はページ間移動のみ（画像OCRや文字の書き直しなし）。対象のページ群について本文単語の欠落・重複を自動検査。
- 52・55ページで元の小さなロゴに大きなロゴが重複していたため、自動追加を除外。ページ番号55ページと原文7分割の範囲は維持。
- 自動生成順序：承認済み原本から組版 → 指定5ページの改ページ調整 → OCR文字層とページ番号を再作成 → GitHub公開。

### 生成後ロゴの検証と二重化対策
- ロゴ画像は7規定の最終ページへ必ず1回生成する。旧原本由来の余分なロゴは、ページ52のフッター下だけ白で覆い、フッター罫線を再描画する。ページ55は本文を再配置するときに元のロゴだけを1回コピーする。
- ロゴ検査は上右側の安全領域を対象とするので、最終ページにロゴが無いPDFは公開されない。

## Website branding and icon assets (2026-11-01)
- Source: `assets/mjx-logo.svg`, vectorized from the official magenta-background MJX logo provided by the community owner. The emblem and wordmark retain their original outlines.
- `scripts/generate_brand_assets.py` renders the site favicon, Apple touch icon, PWA icons, and 1200×630 Open Graph sharing preview.
- `.github/workflows/generate-mjx-icons.yml` regenerates binary images and publishes them when the SVG source or generator changes.
- Static Japanese/English home, regulations and About pages, and the Flask/Jinja homepage have favicon, app-icon and social meta tags.
- The Flask homepage points its icons at the GitHub Pages asset URLs to avoid dependence on Flask static route configuration.
- `assets/site.webmanifest` provides the installable web app icon metadata. App icon generation does not modify the legal regulation PDF logos.

## 2026-11-01: オリジナル画像をそのまま使用
- 前のベクタートレースとXマーク単独の切り抜きは使用しない。ユーザー提供の背景・X・「MTR Japan Nexus」の文字を含む**全体の構図**を、アイコン・ホーム画面・SNS画像に共通使用する。
- サイト用の容量削減として元画像の構図を維持したWebPを `assets/original-logo/source-*.b64.txt` に保存し、`scripts/generate_brand_assets.py` でPNGとICOへ変換。小さいサイズへの縮小以外は切り抜き・再デザインしない。WebP変換は不可逆圧縮のため、ピクセル単位での元PNGの完全同一コピーではない。
- 公開用SNS共有画像は正方形のまま（512×512）、X/Twitterカードも正方形向け表示にする。
- `assets/mjx-logo.svg` と `assets/mjx-mark.svg` は過去版のため、HTMLから参照しない。規定PDFのロゴは変更しない。
