# 3DSL Viewer Smoke Test (Phase0 baseline)

## baseline
- public/3dss/sample/core_viewer_baseline.3dss.json

## 起動
1. npm install
2. npm run dev
3. dev harness を開く（DEFAULT_MODEL で自動ロード）

## 必須スモーク
1. baseline が表示される
2. Orbit 回転できる（ドラッグ）
3. ズームできる（ホイール）
4. Frame UI があるなら slider/step/play が動く（複数フレーム時）
5. Console に error が出てない
6. npm run check:phase0 が通る
