了解。方針として「本文テキスト＝Markdown（content.md）に画像を混ぜる」を正式採用、って前提で `library-page-policy.md` を差し替え版に更新しとくわ。下をそのまま **丸ごと置き換え**でOK。

````md
# Library コンテンツページ方針（SEO/広告/運用のブレ止め）

## 0. 目的
- **広告掲載の主戦場**を「コンテンツ固有のHTML詳細ページ」にする
- 検索エンジン・SNS（OGP）に **コンテンツの意味（タイトル/説明/タグ/参考等）を確実に渡す**
- 3D表示体験（viewer）は **共通アプリとして一斉改善**できる形を維持する
- “ページごとの特殊対応”で破綻しないよう、最初は **ひな型 + ON/OFF** で運用する

---

## 1. 現状の構造（問題の整理）
- 現状は実質 **viewer の1枚HTML（アプリシェル）**に `?model=...` でコンテンツを切り替える構造
- `_meta.json` や `model.3dss.json` は **JSが後からfetch**して表示する
- この方式だと、クローラ/OGPが **初回HTMLだけ読む場合にコンテンツ本文へ到達しにくい**（SEO・SNSカードが弱くなりがち）

---

## 2. 採用方針（両取り）
### 方針A：入口＝静的HTML詳細ページ（コンテンツ別）
- `/library/<ID>/` に **コンテンツ固有のHTMLページ**を生成する
- ここに **メタ情報と本文（必要なら）を“テキストとして”出す**（検索と広告の主戦場）

### 方針B：体験＝viewer（共通アプリ）
- 3D表示・操作UIは従来どおり `/viewer/?model=...` の共通アプリで提供
- 詳細ページから viewer は原則「開く」（最初はこれが安全）。埋め込みは後回しでもよい

> 結論：**詳細ページが正、viewerは体験用**。役割分担する。

---

## 3. URL設計（ブレ防止）
- 詳細ページ（正）：`/library/<ID>/`
- viewer（体験用）：`/viewer/?model=/_data/library/<ID>/model.3dss.json`（例）

運用ルール：
- 共有URLは **詳細ページ**を基本にする
- 既存の viewer URL は壊さず残す（共有リンク資産を守る）

---

## 4. ひな型（テンプレ）設計：標準レイアウト
### 標準セクション（常設）
- **Viewer導線**
  - 「Viewerで開く」ボタン（必須）
- **メタ情報欄（ビルド時生成）**
  - タイトル（H1）
  - サマリー/説明（検索用の段落）
  - タグ
  - 権利/出典/参考文献（あれば）
- **広告**
  - PC：右サイド（スクレーパ相当）
  - モバイル：上（トップ）

### オプショナルセクション（あるときだけ表示）
- **本文テキスト（Markdown）**：`content.md`
- **参考ファイル**（PDF等）：リンク（必要なら埋め込みは後回し）
- **画像/図表**：本文Markdown内に混在（詳細は後述）

---

## 5. モバイルで地獄化させないルール
- **テンプレは基本1種類（最大でも2種類）**
- コンテンツごとのカスタマイズは「レイアウト変更」ではなく **表示するセクションのON/OFF**でやる
- CSSはページ個別に増やさず、テンプレ側で
  - PC：`grid` で「本文領域」/「右サイド広告」
  - Mobile：縦積み（広告→メタ→viewer導線→本文→添付）
- 広告枠は **出す/出さないでDOM自体を切る**（空枠を残さない）

---

## 6. 広告枠の設計（スロットID + allowlist）
### スロットはテンプレ側で “位置ID” として固定
例：
- `mobile_top`
- `desktop_sidebar_top`
- `desktop_sidebar_mid`
- `in_content_1`
- `in_content_2`

### コンテンツごとに「使う枠だけ列挙（allowlist方式）」
- 広告なし：`[]`
- 通常：`["mobile_top","desktop_sidebar_top"]`
- 多め：`["mobile_top","desktop_sidebar_top","in_content_1"]`

allowlist方式の利点：
- テンプレに枠を追加しても既存ページの挙動が変わらない
- “このページは広告ゼロ” が自然に実現できる

---

## 7. コンテンツファイル配置（運用を単純化）
`packages/3dss-content/library/<ID>/`
- `model.3dss.json`（必須）
- `_meta.json`（必須：title/summary/tags/rights/references…）
- `content.md`（任意：本文Markdown）
- `assets/`（任意：画像など）
  - `fig1.png` / `fig2.webp` など
- `attachments/`（任意：PDF等）
  - `paper.pdf`
  - `slide.pdf`

---

## 8. メタ情報の取り込み（ビルド時）
- `_meta.json` は **ビルド時に読み**、詳細ページHTMLに焼き込む（JS依存を減らす）
- `content.md` がある場合は **ビルド時にMarkdown→HTML変換して本文として組み込む**

推奨：`_meta.json` にページ制御用 `page.*` を持つ（または `page.json` 別ファイル）

例（案）：
- `page.ads: string[]`（使用する広告スロットIDのallowlist）
- `page.showText: boolean`（content.mdを出すか）
- `page.attachments: {label,url}[]`（添付一覧）
- （将来）`page.variant: "default" | "essay"`（テンプレ2種目を切る時だけ）

---

## 9. 本文（Markdown）に画像を混ぜる運用（正式採用）
### 基本
- 画像は **ファイル置き**（`assets/`）を基本にする
- `content.md` 内で通常のMarkdown記法で参照する

例：
```md
文章…

![図1: 概念図](/_data/library/<ID>/assets/fig1.png)

続き…
````

### 画像の見た目（統一のための最小ルール）

* キャプションやサイズ調整が必要なら、Markdown内に素のHTMLを混ぜてよい（MDX/Astroは現時点で使わない）
  例：

```md
<figure class="fig">
  <img src="/_data/library/<ID>/assets/fig1.png" alt="図1: 概念図" loading="lazy" decoding="async">
  <figcaption>図1: 〜</figcaption>
</figure>
```

### 非推奨

* data URL（HTMLにbase64貼り付け）は原則避ける（HTML肥大・キャッシュ不利）

---

## 10. SEO/OGPの基本ルール

* 詳細ページで以下を確定させる

  * `<title>`（タイトル）
  * `<meta name="description">`（サマリー）
  * OGP（title/description/image/URL）
  * canonical（詳細ページURL）
* viewerは体験用。検索に出したくないなら段階的に `noindex` を検討

  * ただし移行直後はいきなり切らず、様子見でもOK

---

## 11. 移行手順（低リスク）

1. 詳細ページ生成を実装（既存viewerはそのまま）
2. library一覧のリンク先を **詳細ページ**に切り替え
3. 詳細ページに「Viewerで開く」を必ず置く（互換維持）
4. ある程度整ったら、viewerの扱い（検索に出す/出さない）を判断

---

## 12. 移行リスクとガード

* URL資産：viewer URLは壊さない（共有リンク維持）
* 重複：入口を詳細ページに寄せる（内部リンク・sitemap）
* 運用破綻：個別レイアウト禁止、ON/OFF中心、テンプレ分裂を抑制
* 品質：ビルド前に `_meta.json` 必須項目チェック（欠落で落とす）

---

## 13. 最小運用の初期値（推奨）

* テンプレ：1種のみ
* 広告スロット：まず3つだけ（増やすのは後）

  * `mobile_top`
  * `desktop_sidebar_top`
  * `in_content_1`（本文がある場合だけ）
* 通常ページ：`["mobile_top","desktop_sidebar_top"]`
* 広告なしページ：`[]`
* 増枠ページ：`+ "in_content_1"`（例外のみ）

---

## 14. この方針の結論

* **広告と検索の入口＝静的HTML詳細ページ**を用意する
* **表示体験＝viewer**は共通のまま維持し、一斉改善を効かせる
* 本文は **Markdown（content.md）に画像を混ぜる**方式を採用し、まずはMD+素HTMLで運用する
* カスタマイズは最後の砦。最初は **ひな型 + セクションON/OFF**で運用する

```
