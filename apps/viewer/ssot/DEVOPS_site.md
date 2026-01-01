````md
---

# 3DSL Site 開発〜デプロイ手順（Astro + Tailwind / GitHub → Cloudflare Pages）

## 目的

* **SSOT（唯一の編集元）**を守りつつ、`apps/site`（Astro+Tailwind）でサイトを開発する
* `sync:*` によって **public 配下の生成物を常に再生成**できるようにする
* GitHub に push → Cloudflare Pages で **自動ビルド & デプロイ**する
* **多重化・混線（assets乱立 / vendor複製 / publicコミット等）を仕組みで潰す**

---

## リポジトリ構造（前提）

ざっくり：

* `packages/`：共有SSOT（複数アプリで使う素材・固定リソース）
  * `packages/vendor/`：ローカルvendor（three/ajv等）※ここ以外禁止
  * `packages/schemas/`：JSON Schema（例：`3DSS.schema.json`）
  * `packages/3dss-content/`：サンプル3DSSや関連モデル等（gltfなど）
  * `packages/structs/`：struct系の固定データ
* `apps/`：自作アプリ群
  * `apps/site/`：Astroサイト（このドキュメントの主対象）
  * `apps/viewer/ssot/`：viewerのSSOT（編集元）
  * `apps/modeler/ssot/`：modelerのSSOT（編集元）

---

## SSOT方針（絶対ルール）

### 生成物（DO NOT COMMIT）

`apps/site/public/**` は **sync-* が吐く生成物**。git管理しない。

* `.gitignore` で以下を無視（生成物の温床をコミットから排除）
  * `public/assets/**`
  * `public/vendor/**`
  * `public/viewer/**`
  * `public/3dss/**`
  * `public/modeler/**`
  * `public/structs/**`
* `git clean -fdX`（= `npm run clean:generated`）でいつでも消して再生成できる状態にする

> 例外：`apps/site/public/favicon.ico` のような「手で置く静的」は commit 対象にする（このプロジェクトでは favicon をその想定）

### 禁止ディレクトリ（存在したらFAIL）

以下が repo に存在したら **check:ssot が落ちる**ようにしてある：

* `apps/site/src_assets/`（多重化の温床。禁止）
* `apps/viewer/viewer/`（残骸ルート。禁止）
* `apps/viewer/ssot/vendor/`（vendor多重化。禁止）

チェック：`apps/site/scripts/check-no-forbidden-dirs.mjs`

---

## 編集する場所（どこ触るか）

### Site（Astro側）

* `apps/site/src/**`：Astroページ・コンポーネント・Tailwindの見た目
* `apps/site/ssot_static/**`：サイト固有の静的SSOT（例：ロゴ）
  * `sync:assets` が `ssot_static → apps/site/public/assets` へコピーする

### Viewer（埋め込み/配布物）

* 編集元：`apps/viewer/ssot/**`
* 生成物：`apps/site/public/viewer/**`（`sync:viewer` で吐く）
* viewer が参照する静的は基本 `"/viewer/..."` に閉じる（host側も含めてルール固定）
* `apps/viewer/ssot/_generated/**` は生成物なので **`apps/viewer/ssot/.gitignore` で必ず無視**（SSOT側に湧く生成物はここで殺す）

### Vendor（three/ajv等）

* SSOT：`packages/vendor/**`（ここ以外禁止）
* 生成物：`apps/site/public/vendor/**`（`sync:vendor` で吐く）

---

## ローカル開発（基本フロー）

### 1) 依存インストール

```powershell
cd C:\Users\vrrrm\projects\3DSL\apps\site
npm ci
````

### 2) 生成物を同期（SSOT→public）

```powershell
npm run sync:all
```

### 3) 開発サーバ

```powershell
npm run dev
```

`predev` で `sync:all` が走る設定なので、基本は `dev` だけで回る。

---

## チェック（必須）

### SSOT整合チェック（最重要）

```powershell
cd C:\Users\vrrrm\projects\3DSL\apps\site
npm run check:ssot
```

中身（概念）：

* vendor必須ファイル確認（vendor-required）
* 生成物がコミットされてないか（generated-clean）
* viewerのSSOTルール（forbidden-imports / single-writer / ports 等）
* host側の asset path ルール（`/viewer/...` 以外の禁止など）
* host側で `src/assets` を踏んでないか（no-src-assets）
* `src_assets` 等の禁止ディレクトリ検査（forbidden-dirs）

### CI相当（Cloudflareでも回す想定）

```powershell
cd C:\Users\vrrrm\projects\3DSL\apps\site
npm run ci:build
```

`ci:build` は `check:ssot` → `check:phase7` → `build` を回す想定。

---

## 生成物掃除（用途別）

### A) `.gitignore` 対象を全部掃除（public生成物も消える）

```powershell
cd C:\Users\vrrrm\projects\3DSL\apps\site
npm run clean:generated
# 何が消えるかだけ見たいなら
npm run clean:generated:dry
```

→ その後 `npm run sync:all` で復元。

### B) dist/.astro だけ掃除（ビルド痕跡だけ消す）

```powershell
cd C:\Users\vrrrm\projects\3DSL\apps\site
npm run clean:build
```

---

## assets path ルール（混線防止）

* viewer資産：`/viewer/assets/...` で参照（host側もこのルールに合わせる）
* site資産：`/assets/...`（`ssot_static → public/assets` へ sync されたもの）

禁止の例：

* viewer内で `/assets/...` を踏む
* 相対 `./assets` `../assets` で迷子ルートを作る

---

## GitHub運用（基本）

### 原則

* ブランチ運用：`main` は常にデプロイ可能状態（壊さない）
* 変更は必ずブランチで行う（PRでPreview確認してから merge）
* `apps/site/public/**` や `dist/` `.astro/` は生成物なので **commitしない**

  * 迷ったら `npm run clean:generated` / `npm run clean:build` で視界から消してから進める

---

### 0) まず最新を取る（作業開始前の儀式）

```powershell
cd C:\Users\vrrrm\projects\3DSL
git fetch origin
git switch main
git pull --ff-only
```

---

### 1) ブランチ作成

命名例：`chore/xxx` `fix/xxx` `feat/xxx`

```powershell
cd C:\Users\vrrrm\projects\3DSL
git switch -c chore/ssot-cleanup
```

---

### 2) 開発（こまめにゲートを通す）

```powershell
cd C:\Users\vrrrm\projects\3DSL\apps\site

# SSOT整合（最重要）
npm run check:ssot

# 本番相当ビルド
npm run build
```

生成物が邪魔なら：

```powershell
# 生成物（public以下）を全部掃除（.gitignore対象）
npm run clean:generated

# dist/.astro だけ掃除
npm run clean:build
```

---

### 3) 変更確認（commit前チェック）

```powershell
cd C:\Users\vrrrm\projects\3DSL
git status
git diff
```

---

### 4) commit（粒度を小さく）

```powershell
cd C:\Users\vrrrm\projects\3DSL
git add -A
git commit -m "chore(ssot): tighten SSOT gate" -m "forbid duplicate dirs; normalize asset paths"
```

---

### 5) push（初回は upstream 付ける）

```powershell
cd C:\Users\vrrrm\projects\3DSL
git push -u origin chore/ssot-cleanup
```

---

### 6) PR作成（GitHub UI）

* GitHubで `Compare & pull request`
* PR本文に最低限これを書く：

  * 何を変えたか（SSOT/生成物/パス等）
  * どう確認したか（`npm run check:ssot` / `npm run build` / Preview URL など）

---

### 7) PR更新（修正が出たら）

```powershell
cd C:\Users\vrrrm\projects\3DSL
# 修正 -> add -> commit -> push
git add -A
git commit -m "fix: address PR feedback"
git push
```

---

### 8) main追従（長引いたブランチの衝突回避）

**安全寄り（merge）**

```powershell
git fetch origin
git merge origin/main
```

**履歴を綺麗にしたい（rebase）**

```powershell
git fetch origin
git rebase origin/main
# コンフリクト直す → git add → git rebase --continue
git push --force-with-lease
```

---

## Cloudflare Pages デプロイ手順（GitHub連携）

### 前提

* GitHubに repo がある（pushできる状態）
* Cloudflareアカウントあり

### 1) Cloudflare Pages プロジェクト作成

* Cloudflare Dashboard → **Pages** → **Create a project**
* GitHub を接続 → 対象 repo を選択

### 2) Build設定（推奨：apps/site を作業ディレクトリにする）

Cloudflare Pages の設定で：

* **Root directory**：`apps/site`
* **Build command**：`npm ci && npm run ci:build`
* **Build output directory**：`dist`

※ `ci:build` の中で `check:ssot` → `build` まで走る想定。

### 3) Node version（推奨）

Cloudflareの設定（Environment variables等）で固定する。

* `NODE_VERSION`：`20`（またはプロジェクトで固定したいバージョン）

### 4) デプロイの流れ

* `main`（または指定ブランチ）に push → **Production deploy**
* PR/別ブランチ → **Preview deploy**（Pagesが用意するURLで確認）

---

## Cloudflare Pages：Preview / Production の扱い（完全手順）

### 用語

* **Preview deployment**：PR/非Productionブランチのデプロイ（本番に影響しない）
* **Production deployment**：Production branch（例：main）へのデプロイ

---

### 0) Cloudflare 側の設定（最初に一回だけ）

Cloudflare Dashboard → Workers & Pages → 対象Pages → Settings → Builds & deployments

* **Build configuration**

  * Root directory：`apps/site`
  * Build command：`npm ci && npm run ci:build`
  * Build output directory：`dist`
* **Production deployments（Production branch）**

  * `main` を Production branch に設定（または運用ポリシーに合わせて変更）

---

### 1) Preview確認（PRを出したら必ず）

1. GitHubでPRを作る/更新pushする
2. Cloudflareが自動で Preview deployment を作る
3. Pagesプロジェクトの Deployments から Preview URL を開く

Previewで見る最低限：

* ルート導線（Viewer / Library / Docs）
* `/app/viewer` 遷移 → 戻る導線
* モバイル幅320でUI崩れ/被り無し
* Consoleに致命的エラー無し（404大量など）

---

## リリース用（mainへmergeする直前）チェック

### A) ローカル最終ゲート（必須）

PRブランチ上で実行：

```powershell
cd C:\Users\vrrrm\projects\3DSL\apps\site
npm run check:ssot
npm run build
```

### B) 生成物が混ざってないか（念のため）

```powershell
cd C:\Users\vrrrm\projects\3DSL
git status
git diff --name-only origin/main...HEAD
```

---

## mainへmerge → Production反映

### 1) merge（GitHub）

* `Squash and merge` 推奨（運用ルール次第でOK）
* merge後、Production branch が更新される

### 2) Cloudflareで Production deploy 成功確認

Cloudflare Dashboard → Workers & Pages → 対象Pages → Deployments

* 最新の **Production** が Success になっているか確認
* 失敗時は build log を見て、まず Root directory / Build command / Output directory を疑う

---

## Preview/Production の「切り替え」運用パターン

### パターン1：`main` = Production（シンプル）

* PR/ブランチ：Previewで検証
* mainへmerge：即Production

### パターン2：`staging` = Production（段階昇格したい場合）

Cloudflare Pagesの Production branch を `staging` に変える

* PR：Preview（検証）
* `main`：統合用（まだ本番に出さない）
* `staging`：本番反映用（ここへmergeした時だけProduction）

---

## ロールバック（本番が壊れた時の最短手順）

* 直前のPRを revert して main（または staging）に入れるのが最短

```powershell
cd C:\Users\vrrrm\projects\3DSL
git switch main
git pull --ff-only

# 取り消したいコミットを revert（SHAは対象に合わせる）
git revert <SHA>
git push
```

→ push後、Cloudflareが自動で Production deploy をやり直す

---

## デプロイ前チェックリスト（最短）

```powershell
cd C:\Users\vrrrm\projects\3DSL\apps\site
npm run check:ssot
npm run build
```

---

## ありがちな事故と対処

### public が空で動かない

`git clean -fdX` した後は当然空になる。
`npm run sync:all` で復元。

### forbidden-dirs で落ちる

以下が復活してないか確認：

* `apps/site/src_assets`
* `apps/viewer/viewer`
* `apps/viewer/ssot/vendor`

### package.json が壊れて npm が動かない（EJSONPARSE）

手編集でカンマ抜け等。`npm pkg set` を使って scripts 追加するのが安全。

### CRLF/LF warning

Windowsではよく出る。運用上は即死ではないが、気になるなら `.gitattributes` で統一を別コミットでやる。

---

## 付録：主要コマンド一覧（apps/site）

* `npm run dev`：ローカル開発
* `npm run sync:all`：SSOT→public生成
* `npm run check:ssot`：SSOT整合（必須）
* `npm run ci:build`：CI相当（Cloudflare推奨）
* `npm run clean:generated`：生成物を全部掃除（publicも消える）
* `npm run clean:build`：dist/.astro だけ掃除

---

## 付録：pre-commitで「人間のミス」を物理的に止める（任意だが強い）

### 1) `.githooks/pre-commit` を作る

`C:\Users\vrrrm\projects\3DSL\.githooks\pre-commit` にこれ：

```sh
#!/bin/sh
set -e
echo "[pre-commit] apps/site check:ssot..."
npm --prefix apps/site run check:ssot
echo "[pre-commit] OK"
```

### 2) hooksPath を設定

```powershell
cd C:\Users\vrrrm\projects\3DSL
git config core.hooksPath .githooks
```

（Git Bash等を使うなら `chmod +x .githooks/pre-commit` もやっとく）

---

```
::contentReference[oaicite:0]{index=0}
```
