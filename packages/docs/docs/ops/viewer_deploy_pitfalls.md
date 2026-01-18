
---

### Viewer 配信の落とし穴（Astro routes と public 静的の衝突）

**症状**

* ローカルdevでは正しく表示されるのに、Cloudflare preview だけ viewer が真っ黒 / UIが別物 / モデルがロードされない
* Console はきれい（error/warn なし）
* Network で `viewerHostBoot.js` や `bootstrapViewer.js` が見えない、または別HTMLを掴んでる
* UIが「昔の構成」に戻ったように見える（キャッシュ疑い）

**原因**

* `apps/site/src/pages/viewer/index.astro` が存在すると Astro が `/viewer/index.html` を生成し、
  `apps/site/public/viewer/index.html`（静的viewer）と **同じパスを取り合う**。
* Cloudflare Pages では、リダイレクトや末尾スラッシュ解釈も絡み、環境差として顕在化する。

**解決**

1. `/viewer` を Astro routes から排除する

   * `apps/site/src/pages/viewer/**` を削除（フォルダごとでOK）
2. `_redirects` で挙動を明確化

   * `/viewer/* 200`（静的固定）
   * `/viewer` と `/viewer/` のみ `/app/viewer` に 302（導線用）
3. キャッシュ事故を潰す（preview差分対策）

   * `/viewer/*.js` は `Cache-Control: no-store`（必要範囲だけ）

**運用ポリシー**

* `apps/site/public/{viewer,schemas,vendor,3dss,...}` は “同期される配布物” なので、
  **同名パスを `apps/site/src/pages/**` に作らない**。
* “UI付きビューア” は `/app/viewer`、
  “素のviewer（配布物）” は `/viewer/index.html?...` で分離する。

**確認手順（再発時の最短チェック）**

* Cloudflare preview で `/viewer/index.html?embed=0&mode=prod&ts=1` を直打ち
  → Network に `viewerHostBoot.js` と `bootstrapViewer.js` が 200 で出るか
* `/viewer` を開く
  → `/app/viewer` に 302 されるか
* Hard reload しても UI が古い版に戻らないか（no-store が効いているか）

---
