# Viewer regression smoke

## 目的

- `fixtures/regression` を Viewer で軽く流して、
  - 3DSS ロード
  - schema validator / エラー表示
  - gizmo / orbit / 選択
  - UI の最低限
  が壊れてないことを確認する。

## 前提

- sync を通して `apps/site/public/**` が最新になっていること。
  - `npm --prefix apps/site run sync:all`

- CI/ローカルの回し方
  - regression suite だけ: `npm --prefix apps/site run check:viewer:regression`
  - 最終ゲート: `npm --prefix apps/site run check:release`

## ブラウザでの確認

### valid: center visible

- `http://localhost:4321/viewer?profile=devHarness_full&model=/3dss/fixtures/regression/valid_center_visible.3dss.json`

期待:
- 中心にマーカーが表示され、選択できる
- console に fatal error が出ない

### invalid: schema missing required

- `http://localhost:4321/viewer?profile=devHarness_full&model=/3dss/fixtures/regression/invalid_schema_missing_required.3dss.json`

期待:
- PUBLIC_SCHEMA_ERROR など「公開向け」カテゴリで落ちる（生の Ajv 例外を出さない）

### invalid: schema_uri prerelease

- `http://localhost:4321/viewer?profile=devHarness_full&model=/3dss/fixtures/regression/invalid_schema_uri_bad_prerelease.3dss.json`

期待:
- schema_uri の不正（prerelease 禁止等）が UI で見える

## console runner

Runner は Viewer 配下に配置される（`/viewer/docs/test/*`）。

```js
// cache-bust しつつ import
const r = await import("/viewer/docs/test/regressionRunner.js?ts=" + Date.now());
await r.runAll();
```

期待:
- すべての valid が PASS
- invalid は「想定どおり失敗」扱いで PASS

