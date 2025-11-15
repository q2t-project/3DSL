# 3DSL Assets Directory

本ディレクトリは **Viewer / Modeler / Common** で共通利用される静的リソースを統合管理する。

---

## 📂 構成一覧

| フォルダ | 用途 | 備考 |
|-----------|------|------|
| `css/` | テーマ・共通スタイル定義 | `/assets/css/3dsd_theme.css` |
| `fonts/` | UI・コンテンツ用フォント | Noto Sans JP, JetBrainsMono, MathJax |
| `icons/` | UIアイコン素材 | Material Symbols subset |
| `images/` | 固定イメージ・プレースホルダー | `/assets/images/placeholders/` |
| `logo/` | Viewer/ModelerロゴSVG | 黒背景ベースのBebas Neue系デザイン |
| `textures/` | 背景・UIテクスチャ | grid, noise, metal, glassなど |
| `report_template.html` | Codexレポート出力テンプレート | `/code/common/report/` が参照 |
| `meta/assets_manifest.json` | 構成索引 | Codexの静的検証用 |

---

## 🧩 管理方針
- すべてのアセットは **ローカルリポジトリ内完結**。外部CDNは利用しない。
- Codex実行時に `/assets/meta/assets_manifest.json` を照合して存在確認を行う。
- 実運用時、UIの軽量化に応じて `textures/ui/` 内素材を段階的に最適化。

---

## 🪶 ライセンス
- **Noto Fonts**: [SIL Open Font License](https://scripts.sil.org/OFL)
- **Material Symbols**: Apache License 2.0
- **その他生成テクスチャ**: MIT（AI生成）

---

**Status:** ✅ 全アセットカテゴリ整備完了（Codex参照可）
