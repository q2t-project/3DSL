# 3DSL UI Textures

UI層（HUD・パネル・ツールバー・ボタンなど）で使用される装飾用テクスチャ群。

| ファイル名 | 用途 | 備考 |
|-------------|------|------|
| glass_panel_blur.png | モーダルやHUDの半透明背景 | 透過＋ソフトグロー。UIコンテナ専用。 |
| carbon_fiber_tile.png | ツールバー・タブ装飾 | 繰り返し可能（tileable）素材。 |
| bg_noise_dark.png | UI背景の質感補助 | 非主張型。パネルやメニュー背景に。 |
| metal_brushed_gray.jpg | ダッシュボード系UI装飾 | 広い面積に使用しない。部分装飾用。 |

- 全テクスチャは AI 生成＋手動微調整による CC0 相当素材。
- 原則 `/assets/textures/content/` 内の要素と混用しないこと。
- 新規追加時はファイル名命名規則を守る（用途＋特徴＋色調）
- 生成方法（AI／Nodeスクリプト等）を記録する場合は `/meta/tools/texture_generator.py` へのリンクを記す
- 不使用となった素材は `/assets/textures/obsolete/` に退避