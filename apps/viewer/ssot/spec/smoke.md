# 3DSL Viewer Smoke Test

目的：自動チェック（AJV / invariants）では拾えない「起動・操作・見た目」の破綻を最短で検出する。

注:
- 原則は `/app/viewer`（site 本番導線）でスモークする
- `/viewer/index.html` は dev harness / 低レイヤ切り分け用途（必要な時だけ）

---

## 対象モデル

### baseline（E2Eの固定）
- /public/3dss/scene/default/default.3dss.json

### canonical（回帰用：仕様どおりに通る/落ちるを固定）
- valid:
  - /public/3dss/canonical/valid/sample01_minimal.3dss.json
  - /public/3dss/canonical/valid/sample02_mixed_basic.3dss.json
  - /public/3dss/canonical/valid/sample03_frames_visibility.3dss.json
  - /public/3dss/canonical/valid/sample04_geometry_variants.3dss.json
  - /public/3dss/canonical/valid/sample05_effects.3dss.json

---

## 起動

1. npm install
2. npm run dev
3. dev harness を開く（DEFAULT_MODEL が自動ロードされる）
   - 例: `/viewer/index.html`
4. 別モデルは `?model=...`（harnessの仕様に従う）

---

## Fast Smoke（半自動・短時間）
目的：UI消失/片側表示/入力不能などの「1日溶ける系」を即切り分ける。

### 実行方法（ブラウザ）
1. `/app/viewer?model=/3dss/scene/default/default.3dss.json&dbgHub=1` を開く
2. DevTools Console で以下を実行
   ```js
   const { runSmoke } = await import("/viewer/test/smokeViewerRunner.js?ts=" + Date.now());
   await runSmoke();
   ```
3. 画面サイズを変えて再実行（`runSmoke()` だけ再度呼ぶ）
4. `/app/viewer?model=/3dss/canonical/valid/sample02_mixed_basic.3dss.json&dbgHub=1` でも同様に実行
5. 失敗したら `apps/viewer/ssot/spec/repro_cases.md` に最短手順とログ（smoke出力）を貼る

この `runSmoke()` はブラウザ自動化（Playwright 等）からもそのまま呼べる前提の最小スモークです。

### 観測点（OK/NG）
- canvas が DOM 上に存在し、表示領域が 0x0 になっていない
- UI ロール要素が「存在する場合」display:none になっていない（存在しない場合は skip）
- canvas の CSS サイズと実描画サイズの比率が極端でない（例: 0.5倍/2倍など）
- elementFromPoint で canvas 周辺が取得できる（全面オーバーレイに奪われてない）
- viewerHub が初期化済み（`dbgHub=1` で露出している場合）
- 失敗した観測点は `incident_patterns.md` の該当章（CSS/Canvas/Layout/Input/Runtime）で切り分ける

---

## 必須スモーク（毎回）

### A. baseline（DEFAULT_MODEL）
1. モデルが表示される
2. Orbit 回転できる（ドラッグ）
3. ズームできる（ホイール）
4. Console に error が出てない（warning は内容による）
5. `npm run check:phase0` が通る

### B. canonical（手動ロードして確認）
#### sample02_mixed_basic（points/lines/aux）
1. points/lines/aux が全部見える
2. filter トグル（lines/points/aux）が効く（表示が切り替わる）
3. world axes toggle（あるなら）が効く

#### sample03_frames_visibility（frames）
1. frame UI が動く（slider / step / play）
2. frame を変えると出たり消えたりする（frames指定どおり）

#### sample04_geometry_variants（非straight系）
1. polyline / bezier / catmullrom / arc が表示される
2. console error なし（geometry不足などで落ちてない）

#### sample05_effects（line effects）
1. effect が有効になってる（pulse/flow/glow のどれかが視認できる）
2. console error なし

---

## 任意（実装がある場合だけ）

- クリックで選択できる（選択ハイライトが出る）
- macro/micro 切替が動く（表示ラベルや挙動が変わる）
- gizmo HOME / 軸スナップ / autoOrbit が動く（UIがある場合）

---

## 失敗時のメモ（短く残す）

- どのモデルで落ちたか（URL/ファイル）
- console の先頭エラー（1〜3行で十分）
- 再現手順（最短）
- `runSmoke()` の NG 行（そのままコピペ）
- 可能なら環境（OS/Browser/画面幅/DPR/ズーム）
