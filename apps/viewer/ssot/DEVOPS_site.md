# DEVOPS_site.md (SSOT: 3DSL Site / Astro + Tailwind / Cloudflare Pages)

## Canonical /viewer route SSOT (DO NOT BREAK)

- `/viewer` は **`src/pages/viewer/index.astro` だけ**で定義する（これが正統）
- `src/pages/viewer.astro` は **禁止**（存在したら build 前ガードで失敗）
- `src/pages_disabled/**` も **禁止**（`src/`配下に置くと事故るので、置かない）

### 理由
- Astro は「Git管理かどうか」に関係なく、`src/pages/**` に実体ファイルがあるだけでルートを生成する。
- そのため untracked の `src/pages/viewer/index.astro` が混入すると、
  `/viewer` が二重定義になり、さらに Astro compiler が nil pointer で落ちる事故が再発する。

## Guardrails (build前に機械で止める)

`apps/site/scripts/guard-prebuild.mjs` が以下を検知したら **Astro 実行前に exit(1)** する。

- `src/pages/viewer.astro` が存在（禁止）
- `src/pages_disabled/` が存在（禁止）
- `src/pages/viewer/index.astro` が無い（必須）
- `apps/site/apps/site` のような二重ネストが存在（禁止）

### 適用コマンド（1回だけ）
```
cd apps/site
node scripts/apply-guardrails.mjs
```

### 以降の運用
- guard 実行（単体）
  - `npm run check:guards`
- 自動実行（build入口）
  - `npm run build` （prebuildでguardが必ず走る）
- 自動修復（危険物の削除＋viewer/indexの最小生成）
  - `npm run fix:guards`

## Cloudflare Pages (Production/Preview)

- Production: `https://<project>.pages.dev` （例: 3dsl.pages.dev）
- PR を作ると Preview の固有URLが自動生成される（Deploymentsから確認）

## 注意：PowerShellでのパス事故
- `apps/site` に入った状態で `apps/site/...` と打つと `apps/site/apps/site/...` を生成して事故る。
- コマンドは **「今どこにいるか」**で相対パスを変えること。
