# 3DSL Viewer Smoke Test

目的：自動チェック（AJV / invariants）では拾えない「起動・操作・見た目」の破綻を最短で検出する。

---

## 対象モデル

### baseline（E2Eの固定）
- /public/3dss/sample/3dsl_concept.3dss.json

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
4. 別モデルは `?model=...`（harnessの仕様に従う）

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
