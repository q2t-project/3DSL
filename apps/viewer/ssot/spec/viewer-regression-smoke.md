# Regression Smoke / Regression 手順（固定）

## 0. 前提
- dev server が起動できること（例: npm run dev）
- Regression fixtures が public/3dss/fixtures/regression/ に存在すること
- devHarness_full で viewerHub が window.__viewerHub に出ていること（推奨）
  - もし無いなら dev harness の boot 完了時に:
    - window.__viewerHub = viewerHub;

## 1. 自動チェック（毎回）
- node scripts/check/viewer-regression-suite.mjs
  - schema validate（fixtures）
  - ref endpoint 簡易整合（fixtures）
  - single-writer / core-contract / hub-contract / hub-noop（存在するもの）

## 2. 起動：valid は起動、invalid は throw（目視）
- /viewer?profile=devHarness_full&model=/3dss/fixtures/regression/regression_valid_center_visible.3dss.json
  - 起動して操作できる（orbit/zoom）
- /viewer?profile=devHarness_full&model=/3dss/fixtures/regression/regression_invalid_schema_missing_required.3dss.json
  - 例外/エラーで起動しない（console で throw を確認）

## 3. strictValidate / validateRefIntegrity の分岐（console）
- invalid_ref を strictValidate=false で試す（起動する想定）
- strictValidate=true で試す（ref integrity で throw する想定）
※ bootstrapViewerFromUrl の options は runtime_spec に合わせる

## 4. 不可視は絶対に選べない（runner）
- valid_center_visible をロードした状態で console:
  - const hub = window.__viewerHub;
  - const r = await import("/viewer/test/viewerRegressionRunner.js");
  - await r.runAll(hub);
  - selection.select(invisible uuid) が null になってること

## 5. pick：不可視は拾えない（runner + fixture）
- center_invisible をロードして console:
  - hub.pickObjectAt(0,0) が null

## 6. micro：侵入条件（runner）
- autoOrbit 中 / playback 中は mode.canEnter が false
- 通常時に micro.enter → micro.exit が例外なし

## 7. playback：frameRange null は startPlayback no-op（no_frames fixture）
- no_frames をロードして UI か console で startPlayback
- uiState.runtime.isFramePlaying が false のまま

## 8. resize：歪み（目視）＋ pick が死なない（runner）
- ブラウザのリサイズ（縦長/横長）を何度か
- 画が歪まない（目視）
- runner で pick after resize が例外なし

## 9. dispose：以後 no-op（runner）
- runAll の最後に dispose を実施
- dispose 後に pick は null、start しても例外なし
