# 3DSS とは

3DSS（3D Structured Scene）は、3DSL が扱う **シーン（関係構造）のスナップショット**を JSON で表すためのデータ形式。

主に次の要素で構成される：

- **points**：点（テキスト／ノード／位置）
- **lines**：線（関係／接続）
- **aux**：補助要素（任意）
- **document_meta**：タイトル等のメタ

Viewer は 3DSS を読み込んで表示し、Schema（`3DSS.schema.json`）で整合性を検査できる。

目的は「綺麗な図」より、**探索・比較・往還**をやりやすくすること。

関連：
- FAQ: [/faq/what-is-3dss](/faq/what-is-3dss)
- Schema: [/docs/schema/latest](/docs/schema/latest)