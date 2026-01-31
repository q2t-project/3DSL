# AGENTS.md (Modeler)

目的: AI / 人間が **Modeler** を中心に repo を安全・最短で操作するための地図。


* 本書自体は SSOT ではない。**SSOT の場所を指し示すための索引**である。

---

## Review Guidelines（最優先）

* **SSOT（単一の真実）を壊す変更は NG**。重複定義を増やさない。
* dist / public / vendor 等の **生成物・ミラーは原則編集禁止**（SSOT 側を直す）。
* 既存の契約（viewer embed contract / DOM contract）を破る変更は **P0 扱い**で必ず指摘。
* 影響範囲が読めない **大規模リネームは禁止**。最小差分を優先。
* 「とりあえず動く」暫定コード（TODO 乱立・仮配線）は避ける。

---

## Public Routes（重要な決定メモ）

* Viewer bundle base: `/viewer/`

* Viewer embed host: `/app/viewer`

* Modeler bundle base (current): `/modeler_app/`

  * Astro 側で `/modeler/` を使用しているための衝突回避

* Modeler bundle base (target): `/modeler/`

  * 最終的に `/modeler_app/` を廃止し寄せる

* Modeler embed host: `/app/modeler`

---

## Repo Map（入口）

* `apps/site/`

  * サイト本体（Astro）

* `apps/viewer/ssot/`

  * Viewer の SSOT（runtime / core / ui / contracts）

* `apps/modeler/ssot/`（※想定・整理対象）

  * Modeler の SSOT（runtime / core / ui / contracts）

* `packages/3dss-content/`

  * ライブラリ content と dist 生成元

* `packages/docs/`

  * 共有ドキュメント（契約 / 運用 / ポリシー / 進捗）

* `packages/vendor/` or `/vendor/`

  * 共有 vendor（three / ajv 等）

---

## System SSOT（真実の場所）

* **Schema SSOT**:

  * `packages/schemas/3DSS.schema.json`

* **Viewer SSOT**:

  * `apps/viewer/ssot/**`

* **Modeler SSOT**:

  * `apps/modeler/ssot/**`
  * Modeler の runtime / core / ui / contracts の唯一の編集元
  * `/modeler_app`, `/app/modeler` はホスト・配布物であり SSOT ではない

* **Docs SSOT**:

  * `packages/docs/**`

* **Content SSOT**:

  * `packages/3dss-content/**`

---

## Generated / Mirrored（触るな）

* `apps/site/public/**`

  * 配布物。直接編集禁止

* `apps/site/src/content/**`

  * ミラーの可能性あり。編集前に必ず生成元を確認

* `dist/`, `public/`, `vendor/`

  * 生成物 / ミラー扱い

---

## Modeler-specific Constraints（重要）

Modeler は「編集体験」そのものが契約であり、挙動変更は特に慎重に扱う。

### 以下は **P0 扱い**（必ず指摘・合意が必要）

* Undo / Redo のセマンティクス変更
* Dirty state の定義変更
* Save / SaveAs / Export の責務変更
* Pick → Property 同期仕様の変更
* 編集単位（Apply 粒度）の変更

---

## Minimal Diff Policy（最小差分原則）

* 既存の関数名・ファイル名は原則維持
* 1 ファイルで済む変更を安易に分割しない
* 共通化は **2 回以上の実例**が出てから
* Viewer / Modeler 間の語彙差は、揃える前に必ず指摘

---

## Repo Exploration Rules（探索・検索）

* 探索は必ず **SSOT 側から開始**する
* 生成物・ミラー配下を最初の探索対象にしない
* 検索は `tools/search.sh` 等の **ラッパー経由を推奨**
* `rg` が無い環境では `grep` に自動フォールバックする

---

## Commands（よく使う）

* Git hooks（任意だが推奨）

  * `npm run hooks:install`（`.githooks/pre-commit` を有効化）

* dev:

  * `npm --prefix apps/site run dev`

* build:

  * `npm --prefix apps/site run build`

* sync:

  * `sync:all / sync:viewer / sync:modeler / sync:docs / sync:schemas / sync:3dss-content`

* validate:

  * `validate:3dss:canonical / fixtures / regression`

* guard / check:

  * `check:boundary / check:forbidden-import / guard(prebuild)`

---

✅ Library: SSOT / 読み取りルール（確定）

Content SSOT：packages/3dss-content/**（meta.json / model / scripts）

Library index（生成物SSOT）：packages/3dss-content/dist/library/library_index.json（build結果）

Site mirror：apps/site/public/_data/library/library_index.json（syncミラー）

apps/site/public/_data/library/library_index.json は syncでミラーされるだけ（編集禁止）

Astro（server）側は /public 配下を import しない

✅OK：fs.readFileSync(.../public/_data/library/library_index.json) -> JSON.parse

❌NG：import "/_data/library/library_index.json"（Astroの仕様地雷）

/public/_data/** は 配信物。
import（バンドル化）禁止。読むなら server(fs+JSON.parse) か client(fetch)。
対象：apps/site/src/**/*.{astro,ts,tsx,js,jsx,md,mdx}

禁止：import ... "/_data/" と import ... "../public/_data/" 系

例外：なし（例外作ると再発する）

server(fs) で読むのはOK（ただし例外時はページ生存）。

✅ 例外時の方針（落ちてもページは生かす）

readLibraryIndex() 失敗時は：

ページ全体を落とさない

代替として items=[] 扱い + バナー表示（エラー内容は短く）

console には詳細を出してよい（devだけ）

✅ ガードレール（CI/predev）

/public/_data/**.json を import してる箇所があれば CIで落とす（ルール化）

既存の check:pages:no-raw-html と同様に、
check:pages:no-public-json-import みたいなチェックを持つ（※名前は任せる）


---

## Development Progress Hub（進捗管理の拠点）

### 正式な進捗・差分・今後計画の置き場

* **Modeler 実装進捗 SSOT**:

  * `packages/docs/docs/modeler/IMPLEMENTATION_REPORT.md`

このドキュメントは以下の役割を持つ：

* 直近の変更差分（What changed）
* 判断理由・背景（Why）
* 今後の作業計画（From-now plan）

### 運用上の注意

* 実装方針・責務変更・P0 判断は必ずここに反映
* AGENTS.md は「地図」、IMPLEMENTATION_REPORT.md は「履歴と計画」
* docs sync により `packages/docs/docs/**` は site 側へ自動ミラーされる

  * 同一内容を別場所に重複記載しない

---

## Navigation Docs（地図・索引）

* `packages/docs/repo/README.md`

  * 入口

* `packages/docs/repo/MAP.md`

  * 全体マップ

* `packages/docs/repo/INDEX.md`

  * 用語・逆引き索引

* `packages/docs/repo/NAV_POLICY.md`

  * 運用規範

---

## Final Note

* 本書は **迷わないための地図**であり、仕様書ではない
* 仕様・契約・進捗は必ず SSOT に戻す
* 不明点が出た場合は「どこが SSOT か」を先に特定する


---

## Architecture & App Responsibility (Proposed / Fixed)

This section reflects the **confirmed architecture decision**:
**Modeler is an independent application (Policy A).**

### Apps Responsibility
- **apps/viewer/**
  - Runtime viewer application (read-only).
  - No editing, no file I/O.
- **apps/modeler/**
  - Independent runtime editor application.
  - Owns editing UI, dirty/undo, save/export.
  - Must have its own package.json and dev/build/smoke commands.
- **apps/site/**
  - Static distribution & documentation hub.
  - Must not contain viewer/modeler core logic.

### Vendor Policy
- External libraries (e.g. three.js) are centralized in:
  - `packages/vendor/<lib>/` (SSOT)
- `apps/*/public/vendor/` are generated mirrors.
- public/vendor must never be edited directly.

### Packages Policy
- Shared logic lives under `packages/`.
- Packages are the unit of reuse and future publication.
- Apps depend on packages; never the reverse.

### Sync & SSOT
- All mirrors are produced by sync scripts.
- SSOT always lives under packages/.
- If in doubt, SSOT_POLICY.md overrides local convenience.

---

