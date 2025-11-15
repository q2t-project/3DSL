# 3DSL Content Textures

Viewer／Modelerの3D空間内で描画される構造的背景・補助要素。

| ファイル名 | 用途 | 備考 |
|-------------|------|------|
| grid_overlay_alpha.png | 3Dビュー背景グリッド | Viewer/Modeler共通。透明PNG。 |
| grid_16px_alpha.png | 高密度グリッド（Modeler向け） | Editorモードでスナップ補助に使用。 |

- UI層（HUD・パネル等）では使用禁止。
- `Renderer` 内での利用を前提とする。
-新規追加時はファイル名命名規則を守る（用途＋特徴＋色調）
-生成方法（AI／Nodeスクリプト等）を記録する場合は `/meta/tools/texture_generator.py` へのリンクを記す
- 不使用となった素材は `/assets/textures/obsolete/` に退避