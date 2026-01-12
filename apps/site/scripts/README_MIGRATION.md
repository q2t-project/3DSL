# apps/site/scripts 整備メモ

この zip は `apps/site/scripts/` を **カテゴリ別に再配置**したもの。

- `scripts/check/`   : チェック（契約/境界/回帰/整合性）
- `scripts/validate/`: AJV での検証
- `scripts/sync/`    : public 生成（sync-*）
- `scripts/guard/`   : prebuild ガード/修復/適用
- `scripts/ajv/`     : AJV ランタイム補助
- `scripts/tool/`    : 手動ツール
- `scripts/dev/`     : 開発用
- `scripts/legacy/`  : 旧スクリプト（互換/検証用に残置）
- `scripts/deprecated/`: 旧エントリのスタブ（実行すると移行先を表示して失敗）

## 旧 → 新（主な移動）
### check
- `check-boundary.mjs` → `check/boundary.mjs`
- `check-generated-clean.mjs` → `check/generated-clean.mjs`
- `check-host-asset-paths.mjs` → `check/host-asset-paths.mjs`
- `check-hub-contract.mjs` → `check/hub-contract.mjs`
- `check-invariants.mjs` → `check/invariants.mjs`
- `check-phase2-contract.mjs` → `check/viewer-bootstrap-public-contract.mjs`
- `check-phase2-core-contract.mjs` → `check/viewer-core-layer-contract.mjs`
- `check-phase3-bootstrap-contract.mjs` → `check/viewer-bootstrap-flow-contract.mjs`
- `check-phase4-hub-contract.mjs` → `check/viewer-hub-boundary-contract.mjs`
- `check-phase4-hub-noop.mjs` → `check/viewer-hub-dispose-safety.mjs`
- `check-phase7-regression.mjs` → `check/viewer-regression-suite.mjs`
- `check-single-writer.mjs` → `check/single-writer.mjs`
- `check-spec-filenames.mjs` → `check/spec-filenames.mjs`
- `check-ui-dom-roles.mjs` → `check/ui-dom-roles.mjs`
- `check-vendor-required.mjs` → `check/vendor-required.mjs`

### validate
- `validate-3dss.mjs` → `validate/3dss.mjs`
- `validate-3dss-samples.mjs` → `validate/3dss-samples.mjs`
- `validate-3dss-fixtures.mjs` → `validate/3dss-fixtures.mjs`

### sync
- `sync-viewer.mjs` → `sync/viewer.mjs`
- `sync-vendor.mjs` → `sync/vendor.mjs`
- `sync-schemas.mjs` → `sync/schemas.mjs`
- `sync-3dss-content.mjs` → `sync/3dss-content.mjs`

### guard / ajv
- `apply-guardrails.mjs` → `guard/apply.mjs`
- `fix-guards.mjs` → `guard/fix.mjs`
- `guard-prebuild.mjs` → `guard/prebuild.mjs`
- `ajv-with-formats.entry.mjs` → `ajv/with-formats.entry.mjs`

## package.json 更新の目安（例）
- `node scripts/check-generated-clean.mjs` → `node scripts/check/generated-clean.mjs`
- `node scripts/sync-viewer.mjs` → `node scripts/sync/viewer.mjs`
- `node scripts/guard-prebuild.mjs` → `node scripts/guard/prebuild.mjs`
- `node scripts/validate-3dss-fixtures.mjs` → `node scripts/validate/3dss-fixtures.mjs`

## 追加ガード
- `check/generated-clean.mjs` に **viewer 出力へ `scripts/` が混入したら NG** を追加（SSOT 側 scripts を public にコピーしない前提）。
