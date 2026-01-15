# 3DSL Viewer: Label負荷 計測と最小LOD対策
## 計測UI（debug限定）
- 画面左下の **perf HUD** に以下を表示（`viewer_dev.html?debug=1` の devHarness で有効）
  - FPS（移動平均） / フレーム時間（ms）
  - label総数 / 表示中 label 数
  - label 更新回数（updates） / 文字再生成回数（rebuilds）
  - label culling 件数（distance / screen / frustum）
  - `renderer.info` の calls / triangles / geometries / textures

## 計測結果（観測メモ）
- **label数が増えるほど** `renderer.info.render.calls` と frame time が上がり、FPS低下が体感される。
- `updates` は **ラベル数にほぼ比例**して増加するため、カメラ操作中の更新頻度がボトルネック化しやすい。
- `rebuilds` は **テキスト再同期**（差し替え・再生成）が起きたタイミングでスパイクし、フレーム時間の谷を作る。

## 最小対策（実装済み）
- **距離カリング**
  - `labelConfig.lod.distance` の `maxDistanceFactor` / `fadeStartFactor` で制御。
- **画面サイズカリング**
  - 投影サイズが `minPixels` 未満の label を非表示。
- **更新頻度の抑制（throttle）**
  - カメラ移動中のみ `labelConfig.lod.throttleMs` で更新間隔を制限。
  - 停止後は即時反映。
- **視錐台カリング**
  - frustum 外の label は非表示。

### フラグ/設定
- すべて `runtime/renderer/labels/labelConfig.js` の `lod` 配下でON/OFF可能。

## 手動テスト手順
1. `viewer_dev.html?debug=1` を開く。
2. label が多いモデルをロードする。
3. **操作中**に perf HUD の `FPS / frameMs / calls / label更新` が増えることを確認。
4. **カメラ停止後**に label が正しい位置・サイズで表示されることを確認。
5. 遠景で label が適切に消える（距離/画面サイズ/視錐台）ことを確認。