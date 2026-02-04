# WIP→公開 手順（library 運用）

このドキュメントは、3DSL コンテンツ（3DSS）の制作を **WIP（作業領域）** と **公開SSOT（library）** に分離し、完成したものだけを `packages/3dss-content/library` に投下して公開するための手順書。

## 方針（ブレないための固定ルール）

- **WIP は repo 外（別フォルダ / 別repo）**
  - 誤公開・一覧汚染・CIノイズを避ける
  - AdSense 審査や公開品質の観点でも安全
- repo 内は **完成物のみ**
  - `packages/3dss-content/library/<ID>/` が最終格納（公開SSOT）

---

## ディレクトリ設計

### WIP（repo外の例）

```
C:\Users\<you>\projects\wip\3dsl-content\<work-name>\
  draft\model.3dss.json
  assets\
  sources\    (xlsx / 元データ / スクショ / 参照メモ)
  notes\      (TODO / 検証ログ)
  exports\    (書き出し/共有用)
```

### 公開SSOT（repo内）

```
packages/3dss-content/library/<ID>/
  _meta.json
  model.3dss.json
  (optional) ogp.png 等
```

---

## 手順（WIP → library 投下 → 公開）

### 1) WIP で制作・検証（repo外）

1. `draft/model.3dss.json` を作る（Excel/VBAでも手書きでもOK）
2. viewer で見た目/操作確認
3. 可能ならスキーマ検証も通す（最低でも viewer で破綻がないこと）

### 2) library の公開枠（IDフォルダ）を作成（repo内）

```
npm --prefix apps/site run new:library-item -- --title "..."
```

- `packages/3dss-content/library/YYMMDDxx/` が生成される

### 3) WIP 成果物を完成物としてコピー

- `WIP/draft/model.3dss.json` → `library/<ID>/model.3dss.json`
- OGPやサムネ等が必要なら同フォルダにコピー

### 4) `_meta.json` を記入

- テンプレは `packages/3dss-content/library/_meta.json.template` を使う
- 公開前は `published: false`
- 公開確定で `published: true`

#### 参考文献（references）

- 参考文献・引用元・第三者素材・ライセンス情報は **すべて `_meta.json` に集約**
- 表示（メタパネル等）は後で実装できるが、SSOT として先に入れておく

### 5) チェック → 生成 → 同期

```
# メタ整合チェック
npm --prefix apps/site run check:library

# library_index.json 等を生成して site 側へ同期
npm --prefix apps/site run sync:3dss-content
```

### 6) サイトで確認

- library 一覧に出るか（`published: true` の場合）
- 詳細ページの表示
- viewer 起動・挙動

### 7) 公開（Git運用）

- commit → PR → Cloudflare Preview で最終確認 → merge

---

## 事故防止チェックリスト

- [ ] WIP が repo 内に入ってない（**原則 repo 外**）
- [ ] `model.3dss.json` は library の ID フォルダ配下にある
- [ ] `published` の意図が一致している（false=非公開、true=公開）
- [ ] 参考文献/第三者素材の出典が `_meta.json` に入っている（必要な場合）