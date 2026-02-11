# P8 Premium 回帰テスト＆品質ゲート（最終）

Premium 導入によって **library / site 全体を壊していない**ことを確証するための、毎回の回帰テスト手順（最小セット）。

狙いは 2 つだけ。

1. **public 体験が 1 ミリも悪化してない**（library / viewer / docs / sitemap 等の退行ゼロ）
2. **premium は premium だけで完結**（依存逆流なし）

---

## 0) 前提（P8 が見る対象）

Premium のビルド SSOT は `packages/3dss-content/premium/<slug>/`。

`apps/site` の `prebuild` で `sync:premium` が走り、次が生成される：

- `apps/site/public/api/premium/meta/<slug>.json`
- `apps/site/public/api/premium/model/<slug>.json`

`/premium/<slug>`（概要ページ）は **ビルド時に静的生成**される（＝新 slug 追加後は deploy/build が必要）。

---

## 1) 機械テスト（必須）

### 1.1 build が通る

```bash
npm --prefix apps/site run build
```

期待：

- `sync:all` が完走
- `check:route-collisions` OK
- `check:boundary` OK
- `check:pages:no-raw-html` OK
- `validate:3dss:canonical` OK
- `astro build` Complete

### 1.2 /premium が route collision を起こしてない

`build` に含まれる `check:route-collisions` が担保。
（premium 追加後も OK のままなら合格）

### 1.3 premium の静的ページが生成されてる

ビルド後に `dist` を確認：

```bash
ls apps/site/dist/premium
```

期待：`packages/3dss-content/premium/` に存在する slug 分のサブフォルダがある。

例：`foo/` と `p_test/` がある。

---

## 2) ローカル smoke（必須）

### 2.1 preview 起動

```bash
npm --prefix apps/site run preview
```

### 2.2 library 一覧/詳細が退行してない

- `/library` が表示される
- 任意カードを開いてメタ情報/テキストが表示される
- 詳細ページから Viewer 起動導線が生きてる

（ここが壊れてたら P8 即 NG）

### 2.3 viewer の基本起動が退行してない

- `/app/viewer` が起動
- 既存の library item を `model=` で読ませても boot する

### 2.4 premium 概要ページが表示される

- `/premium/foo`
- `/premium/p_test`

期待：404 にならない。概要の HTML が出る。

### 2.5 premium の API ファイルが配信される（最低限）

ブラウザで直叩き：

- `/api/premium/meta/p_test.json`（JSON が表示される）
- `/api/premium/model/p_test.json`（3DSS JSON が表示される）

---

## 3) SEO 系（最小確認）

### 3.1 sitemap / robots が意図通り生成されてる

ビルドログで：

- `sitemap: .../public/sitemap.xml urls=...`
- `robots:  .../public/robots.txt`

確認（ファイル実体）：

```bash
sed -n '1,120p' apps/site/public/robots.txt
sed -n '1,120p' apps/site/public/sitemap.xml
```

期待：

- sitemap が生成されている（壊れてない）
- robots が生成されている（壊れてない）

※ premium を sitemap に入れる/入れないは方針次第。
現状「premium を sitemap に入れていない」運用なら、**入ってないこと**を確認しておく。

### 3.2 canonical が壊れてない

最低限：`/premium/<slug>` を開いて `view-source:` で canonical が `/premium/<slug>` を指してること。

---

## 4) 依存逆流なし（premium が premium だけで完結）

この repo の基本防波堤は `check:boundary`。

P8 では **結果だけ見る**：

- `npm --prefix apps/site run check:boundary` が常に OK

さらに手動観点（事故予防）：

- `apps/site/public/viewer_app_premium/` は **site の src を import しない**（純 public asset）
- premium の addon は `viewer_app_premium` 内で完結し、`apps/viewer/ssot` の core には依存を増やさない

---

## 5) P8 DoD（合格条件）

- ✅ `npm --prefix apps/site run build` が一発で通る
- ✅ library 一覧/詳細/Viewer が退行してない
- ✅ `/premium/<slug>` が 404 にならない（少なくとも既知 slug）
- ✅ `route-collisions / boundary / pages-no-raw-html / canonical` が全部 OK
- ✅ sitemap/robots の生成が壊れてない（方針どおりの内容）
- ✅ Premium は Premium 側だけで完結（依存逆流なし）

---

## 付録：premium 追加時の地雷（P8 で潰す）

- `packages/3dss-content/premium/` に slug を追加したのに `dist/premium/<slug>/` が生成されない
  - → `getStaticPaths` の入力元が増分を拾えてない / build 前に sync されてない
- `/api/premium/*` が 404
  - → `sync:premium` の出力先がズレた / `public` に載ってない
- premium を触ったのに library が壊れた
  - → 依存逆流（boundary 違反）か、route namespace collision が起きてる
