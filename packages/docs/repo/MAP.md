# Repo MAP

このページは「全体の地図」。細部の網羅より **読む順番と主線** を優先する。

## 入口（まずここ）

- ルール: `AGENTS.md`
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

## Architecture 2026 reader path

承認済み Product v1 の主線:

```mermaid
flowchart LR
  Home[Home / Concept] --> Library[Library]
  Library --> Detail[Library detail / context]
  Detail --> ViewerHost[/app/viewer]
  ViewerHost --> ViewerRuntime[/viewer/* internal runtime]
  ViewerRuntime --> VCore[Viewer core]
  VCore --> Renderer[renderer]
  Content[packages/3dss-content] --> Library
  Product[packages/docs/product] --> Home
  Product --> Library
  Arch[packages/docs/architecture/architecture-2026-v1.md] --> ViewerHost
```

- Public Viewer entry: `/app/viewer`
- Internal Viewer assets: `/viewer/*`
- Product meaning SSOT: `packages/docs/product/**`
- Reader Guide / Reader Bundle は STEP 11 で追加する external product contract。
- 3DSS v1.1.4 は Release 1 では維持する。

## Architecture 2026 decision chain

```text
BASELINE / Audit
→ Product Definition v1
→ Global Gap Baseline v1
→ Architecture 2026 v1
→ Global Backlog v1
→ STEP 11 Library → Viewer
```

Canonical paths:
- `BASELINE.md`
- `packages/docs/audit/**`
- `packages/docs/product/**`
- `packages/docs/gap/**`
- `packages/docs/architecture/**`
- `packages/docs/backlog/**`
- `packages/docs/roadmap/CURRENT_STATE.md`

Architecture 2026 product path:

```text
Library source (model + meta + guide)
→ Library build/validation
→ Library detail/context
→ /app/viewer (public Viewer Session Host)
→ /viewer/* (internal Viewer runtime)
```