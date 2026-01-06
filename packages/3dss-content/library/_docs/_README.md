
```md
# 3DSS Library 保存・管理ルール（採番ID方式）— 運用固定（迷わん版）

## 目的
`packages/3dss-content/library/` は 3DSL Library に掲載する **コンテンツ本体（モデル）** を保存・管理する保管庫とする。  
表示順・棚（おすすめ等）は **編集情報**として別管理し、ここにはコンテンツを蓄積する。

**重要（SSOT固定）：**
- 原本（SSOT）は `packages/3dss-content` にのみ存在する
- アプリ（apps/site）は **dist を public にミラーコピーするだけ**（生成しない／書き換えない）
- Astro 側で `/viewer` の受け口を作らない（/viewer は public が正）

---

## 採番ID（主キー）

### 形式
- `YYMMDDxx` の **8文字**を採番ID（= 主キー）とする
- `YYMMDD` は **採番日**（意味は持たせない）
- `xx` は **base36 2文字**（`0-9a-z`）とする  
  - 例：`00, 01, 02, ... 09, 0a, 0b, ... 0z, 10, ...`
- 正規表現：`^\d{6}[0-9a-z]{2}$`

### 性質
- 採番IDは **フォルダ名・公開ID（slug）**として扱う
- 個人運用につき、採番はローカルで完結してよい
- 採番し直し（廃番→再採番）を許容（必要なら別途エイリアス対応）

---

## フォルダ構成（1コンテンツ = 1フォルダ）

```

packages/3dss-content/library/<YYMMDDxx>/
model.3dss.json
_meta.json        （必須：台帳/一覧/SEOメタ）
thumb.webp        （任意：カード用サムネ）
og.webp           （任意：OGP用画像。無ければ thumb を使う想定）
_sources.md       （任意：出典メモ）
_docs/            （任意：内部用。公開しない）

packages/3dss-content/library/_private/<YYMMDDxx>/...   （非公開置き場：公開対象外）

```

- コンテンツ本体は必ず `model.3dss.json`
- 管理ファイル／内部ドキュメントは混線防止のため **`_` 始まり**を推奨
- **非公開は `library/_private/` に移す**（公開事故防止）

---

## 公開（sync）のルール（SSOTと生成物）

### 原本（SSOT）
- `packages/3dss-content/library/` は **そのまま公開しない**

### 公開用配布物（SSOT=dist）
公開用の配布物は `packages/3dss-content/scripts/build-library-dist.mjs` が生成する  
`packages/3dss-content/dist/` を SSOT とする。

生成先：
- `packages/3dss-content/dist/`
  - `3dss/library/<ID>/model.3dss.json`
  - `3dss/library/<ID>/thumb.webp`（存在する場合）
  - `3dss/library/<ID>/og.webp`（存在する場合）
  - `library/library_index.json`（自動生成）
  - `3dss/sample/**`（Viewer既定サンプルを配る場合のみ）

### site 側（ミラーコピーのみ）
site 側は `dist/` を **ミラーコピー**して `apps/site/public/` に置く。  
**apps 側では library_index を生成しない。**

---

## _meta.json（必須：台帳/一覧/SEOメタ）
`packages/3dss-content/library/<ID>/_meta.json` を必須とする。

最低限（キーは必ず持つ。値は空でもよい）：
- `summary`（一覧用短文）
- `tags`（配列）
- `entry_points` / `pairs` / `rights` / `related`（必要に応じて）
- `title`（SEO title 用：空なら model 由来を使用）
- `description`（SEO description 用：空なら summary を使用）
- `og_image`（任意：空なら og.webp → thumb.webp の順で自動推定）

---

## 3DSS内メタ（最低限）
`model.3dss.json` の `document_meta` に最低限以下を持たせる。
- `document_title`（または `title`）
- `tags`（任意）
- `updated_at`（任意）

補足：
- `document_uuid` 等の固有UUIDは **別軸**で持ってよい（採番IDとは役割が違う）

---

## Library の棚（新着 / おすすめ）の責務分離

### 新着（全件並び）
- `dist/library/library_index.json` の `items` の順序が SSOT
- 基本は **採番ID降順（新しいIDが上）**
- **apps/site 側で勝手に再ソート禁止**

### おすすめ（編集棚）
おすすめ棚は編集情報で持つ（コンテンツ本体ではない）。

- 編集情報：`apps/site/public/library/editorial.json`
  - `recommended`: おすすめ棚のID配列（編集順が表示順）

※ `dist/library/editorial.json` を採用する場合は、生成/同期の責務が増えるため原則は site 側管理を推奨。

---

## 作業手順（固定：この順番以外やらない）

### 1) 追加（新規コンテンツ作成）
推奨（packages 側で完結）：
```

node packages/3dss-content/scripts/new-library-item.mjs --title "仮タイトル"

```
生成後、必ず：
- `model.3dss.json` を編集
- `_meta.json` の `summary/title/description/tags` を埋める
- 必要なら `thumb.webp` / `og.webp` を配置

### 2) 更新（既存の修正）
- `model.3dss.json` / `_meta.json` / 画像 を更新

### 3) 検証（必須）
```

node packages/3dss-content/scripts/check-library.mjs
node packages/3dss-content/scripts/build-library-dist.mjs
npm --prefix apps/site run sync:3dss-content
npm --prefix apps/site run check:boundary

```

### 4) おすすめ更新（並び順の編集）
- `apps/site/public/library/editorial.json` の `recommended` を編集（配列順が表示順）

### 5) デプロイ（Cloudflare Pages）
- git commit → push  
- build では `sync:all` が走る前提（schema/vendor/viewer/3dss-content が揃う）

---

## Viewerリンク（dev差の固定）
- ライブラリの `viewer_url` は **`/viewer/index.html?open=...`** を正とする  
  （Astro dev の `/viewer` 解決差を踏まないため）
- `/viewer`（末尾なし）を本番で整える必要がある場合のみ `apps/site/public/_redirects` で対応する：
```

/viewer  /viewer/  301

```

---

## よくある注意
- `library/_docs/` や `_sources.md` を置いてもOK（ただし dist/public に出さない設計を維持する）
- 採番IDは「意味を持たせない」。タイトルや内容がドリフトしてもIDはそのままでよい
- 「別作品」にしたい場合のみ新しい採番IDを発行する
- apps/site で library_index を生成し始めた瞬間に SSOT が壊れるので **絶対禁止**
```

### 差分メモ（上書きの意図）

* `new:library-item` を **apps/site から packages に寄せる**（SSOT完結）
* 非公開は `library/_private/` に固定（公開事故防止）
* 検証の順番を固定（check → build-dist → sync → boundary）
* viewer_url は `/viewer/index.html?...` を正として明記（dev差を踏まえつつSSOT違反しない）
* おすすめ棚は site 側編集SSOTを維持




おまけ
---
受入条件（機械検証）

# 1) build
node packages/3dss-content/scripts/build-library-dist.mjs

# 2) sync
npm --prefix apps/site run sync:3dss-content

# 3) boundary
npm --prefix apps/site run check:boundary

# 4) hash一致（コピー証明）
Get-FileHash .\packages\3dss-content\dist\library\library_index.json
Get-FileHash .\apps\site\public\library\library_index.json
