# Repo MAP

このページは「全体の地図」。細部の網羅より **読む順番と主線** を優先する。

## 入口（まずここ）

- ルール: `AGENTS.md`
- Modeler 作業ガイド: `AGENTS_MODELER.md`
- 地図: `packages/docs/repo/MAP.md`（このページ）
- 索引: `packages/docs/repo/INDEX.md`

## フォルダ分類（高レベル）

- `apps/site` : サイト（Astro）。`public/**` は配布物なので基本編集禁止。
- `apps/viewer/ssot` : ViewerのSSOT（runtime/core/ui/contracts）。
- `apps/modeler/ssot` : ModelerのSSOT（runtime/core/ui/contracts）。
- `packages/3dss-content` : 3DSS content のSSOT（library/canonical/fixtures）と dist 生成元。
- `packages/schemas` : schema のSSOT（例: `3DSS.schema.json`）。
- `packages/docs` : 共有ドキュメント（契約/運用/ポリシー）。

## 主線（例：サイト→viewer→描画）

```mermaid
flowchart LR
  Site[apps/site] -->|embed/route| ViewerHub[apps/viewer/ssot/runtime/viewerHub]
  ViewerHub --> VCore[core]
  VCore --> VRenderer[renderer]

  Site -->|route| ModelerHost[apps/modeler/ssot (host)]
  ModelerHost --> MCore[core]
  MCore --> MRenderer[renderer]

  Site --> Content[packages/3dss-content]
  Content -->|sync| Public[apps/site/public]
  Schema[packages/schemas] -->|validate| Content
  Schema -->|validate| ViewerHub
  Schema -->|validate| ModelerHost
```

> 注: ここは “代表的な流れ” のみ。正確なエントリポイントは各README/INDEX側でリンクする。
