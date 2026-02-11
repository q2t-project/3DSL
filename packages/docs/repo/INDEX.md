# Repo INDEX（用語・逆引き）

このページは「検索で引ける辞書」。見出し語を固定して、grep/検索に強くする。

## SSOT

- Schema SSOT: `packages/schemas/3DSS.schema.json`
- Viewer SSOT: `apps/viewer/ssot/**`
- Modeler SSOT: `apps/modeler/ssot/**`
- Docs SSOT: `packages/docs/**`
- Content SSOT: `packages/3dss-content/**`
- Premium SSOT: `packages/docs/docs/contracts/SSOT_PREMIUM_POLICY.md`

## 生成物 / ミラー

- 配布物: `apps/site/public/**`（基本編集禁止）
- ミラー候補: `apps/site/src/content/**`（編集元を確認）
- 生成物/ミラー: `dist/public/vendor`（編集禁止）

## 逆引き（やりたいこと → まず見る場所）

### UI（サイト側）

- サイトのページ/導線: `apps/site/src/**`
- 公開用の静的 assets: `apps/site/public/**`（ただし編集は生成元へ）

### Viewer

- 起動/ハブ: `apps/viewer/ssot/runtime/viewerHub.js`（※ファイル名は実体を参照）
- 入力/操作系: `apps/viewer/ssot/runtime/core/**`
- 描画: `apps/viewer/ssot/runtime/renderer/**`
- premium 方針（アクセス制御 / addon 注入）: `packages/docs/docs/contracts/SSOT_PREMIUM_POLICY.md`

### Modeler

- 起動/ホスト: `apps/modeler/ssot/modelerHost.js`
- 起動（public entry）: `apps/modeler/ssot/runtime/bootstrapModeler.js`
- UI shell: `apps/modeler/ssot/ui/attachUiShell.js`
- 境界/ports: `apps/modeler/ssot/manifest.yaml` / `apps/modeler/ssot/_generated/PORTS.md`

### Content（3DSS）

- canonical: `packages/3dss-content/canonical/**`
- fixtures/regression: `packages/3dss-content/fixtures/**`
- library: `packages/3dss-content/library/**`

## Keywords（検索キーワード）

- boundary: `check:boundary` / `forbidden-import`
- modeler:ssot: `check:modeler:ssot`
- sync: `sync:viewer` / `sync:modeler` / `sync:docs` / `sync:schemas` / `sync:3dss-content`
- validate: `validate:3dss:canonical` / `fixtures` / `regression`
