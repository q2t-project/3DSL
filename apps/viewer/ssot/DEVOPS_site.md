# DEVOPS_site.md（SSOT: 3DSL Site / Astro + Tailwind / Cloudflare Pages）

このファイルは「**デプロイまでの正しい手順**」と「**事故りやすいポイントを機械で止めるルール**」のSSOTやで。  
運用の要点は **(1) 正統ルートの固定 / (2) Pagesの制約に合わせる / (3) デプロイ確認を機械化** の3つ。

---

## 0) まず前提（Cloudflare Pages 設定）

Cloudflare Pages のプロジェクト設定はこう固定。

- Root directory: `apps/site`
- Build command: `npm run build`
- Build output directory: `dist`
- Variables:
  - `NODE_VERSION`（例: `20.3.0`）
  - `PUBLIC_FORMSPREE_ENDPOINT`（問い合わせフォーム使う場合）

---

## 1) Canonical ルート SSOT（絶対に壊すな）

### /viewer（正統ルート）
- `/viewer` は **`apps/site/src/pages/viewer/index.astro` だけ**で定義する（これが正統）
- `apps/site/src/pages/viewer.astro` は **禁止**
- `/viewer/dev` `/viewer/run` のようなデバッグ用ページは **本番からは削除**（置くなら別ブランチ・別プロジェクトで）

### 理由
- Astro は **Git管理かどうか関係なく** `src/pages/**` にファイルがあるだけでルートを生成する。
- だから「うっかりファイル残す／untrackedが混入」だけで、ルート二重定義や意図せぬ公開が起きる。

---

## 2) Cloudflare Pages の 404 仕様（ここが最大の落とし穴）

Cloudflare Pages は **Astro の `src/pages/404.*` ではなく**、  
**サイト直下の `404.html`（静的ファイル）** を要求する挙動がある（運用的にはこれに合わせる）。

### 正解
- `apps/site/public/404.html` を置く  
  → build後 `dist/404.html` として出る

### 禁止
- `apps/site/src/pages/404.html.astro`（guardで止める）
- `apps/site/src/pages/404.astro`（同様）
- 「Astro側で404作ればOK」系の発想（Pages側が期待する形式とズレる）

---

## 3) _redirects / _headers（Pages側ルーティング制御）

Cloudflare Pages は `public/_redirects` と `public/_headers` を **そのまま配信設定として読み込む**。  
だから **置き場所は `apps/site/public/` 固定**。

### /viewer/dev と /viewer/run を潰す（本番でアクセスされても正統へ寄せる）
`apps/site/public/_redirects` にこれを入れる：

```
/viewer/dev    /viewer  301
/viewer/dev/   /viewer  301
/viewer/dev/*  /viewer  301
/viewer/run    /viewer  301
/viewer/run/   /viewer  301
/viewer/run/*  /viewer  301
```

確認（期待値: `301` で `/viewer` に飛ぶ）：

```
curl.exe -I https://3dsl.pages.dev/viewer/dev
curl.exe -I https://3dsl.pages.dev/viewer/run
```

---

## 4) Deploy Probe（いま本番がどのコミットかを一発で判別）

`/__deploy_probe.txt` は **本番で「今のデプロイがどのshaか」を判別するためのファイル**。  
これが無いと「デプロイ反映したか分からん」で永久に詰む。

### ルール
- `apps/site/public/__deploy_probe.txt` は **コミットしない**（ダミーが残ると混乱する）
- `guard-prebuild.mjs` が build 前に **同じJSONを public と dist の両方へ書く**
  - これで「本番URLを見てもcommitが分かる」状態になる

### 確認
- Preview（デプロイID付きURL）：
  ```
  curl.exe -s https://<deploy-id>.3dsl.pages.dev/__deploy_probe.txt
  ```
- Production：
  ```
  curl.exe -s https://3dsl.pages.dev/__deploy_probe.txt
  ```

期待される形（例）：
```json
{
  "sha": "c04ca23",
  "builtAt": "2026-01-02T03:36:28.419Z"
}
```

---

## 5) Guardrails（build前に機械で止める）

`apps/site/scripts/guard-prebuild.mjs` が **Astro 実行前に止める**対象：

- 禁止ルートの存在
  - `src/pages/viewer.astro`
  - `src/pages/404.*`（Pagesは `public/404.html` 方式に寄せる）
- 事故りやすいファイル混入（SSOT違反）
- `__deploy_probe.txt` の整合（public/dist）

### コマンド
- 手動チェック：
  - `npm --prefix apps/site run check:guards`
- build入口（必ずguardが走る）：
  - `npm --prefix apps/site run build`
- 自動修復（危険物の削除＋必要物の生成）：
  - `npm --prefix apps/site run fix:guards`

---

## 6) ローカル → デプロイまでの手順（最短ルート）

### (A) ローカルでビルド確認
リポジトリルートで：

```
npm --prefix apps/site run check:guards
npm --prefix apps/site run build
```

成果物確認：

```
Test-Path .\apps\site\dist\404.html
Test-Path .\apps\site\dist\_redirects
Test-Path .\apps\site\dist\__deploy_probe.txt
Get-Content .\apps\site\dist\__deploy_probe.txt
```

### (B) 変更をコミットして push
```
git status
git add -A
git commit -m "chore(site): <変更内容>"
git push origin main
```

### (C) Cloudflare Pages 側でデプロイ確認
1. Dashboard → Workers & Pages → `3dsl` → Deployments  
2. 一番上の Production が最新コミットになってるか見る  
3. **Probeで最終確認**（これが最重要）：
   ```
   curl.exe -s https://3dsl.pages.dev/__deploy_probe.txt
   ```

### (D) 反映が怪しい時（強制再デプロイ）
- 空コミットで押し込む：
  ```
  git commit --allow-empty -m "chore: redeploy"
  git push origin main
  ```
- その後 Probe を見る：
  ```
  curl.exe -s https://3dsl.pages.dev/__deploy_probe.txt
  ```

---

## 7) よくある詰まりどころ（これだけ見とけばだいたい抜ける）

### 404でguardに止められる
- `src/pages/404.html.astro` が残ってる  
  → **消す**、`public/404.html` に寄せる

### /viewer/dev や /viewer/run が 200 で返ってしまう
- `_redirects` が `public` に無い、または `dist` に出てない  
  → `apps/site/public/_redirects` を確認  
  → `npm --prefix apps/site run build` 後に `apps/site/dist/_redirects` を確認

### 本番の `__deploy_probe.txt` が古い／ダミーっぽい
- `public/__deploy_probe.txt` をコミットしてしまってる（ダミー固定で上書きされない）
  → 追跡を外す（例：`git rm --cached apps/site/public/__deploy_probe.txt`）  
  → `.gitignore` で無視  
  → buildで `guard-prebuild.mjs` が生成する形に統一

### PowerShellのパス事故（apps/site/apps/site を作るやつ）
- いまいるディレクトリに対して、さらに `apps/site/...` を付け足してる  
  → 「**今どこにいるか**」で相対パスを変える（基本はリポジトリルートから実行）

---

## 8) AdSense 申請前の最低ライン（現状ページ構成のまま）

- `/policy` にプライバシー・Cookie・広告（AdSense）・問い合わせ先が明示されてる
- `/docs` に「このサイトの目的／使い方／コンテンツの説明」が一定量ある（薄い判定回避）
- `/modeler` は「未完成です」感を抑えつつ、現状できること・予定を明記
- 壊れたリンクや 405/500 を残さない（フォーム送信先など）

---

以上を守れば、「デプロイされたか分からん」「Pagesの404で沼る」「余計なルートが残る」系の事故は潰せる。
