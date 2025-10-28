# Q0-01 フォルダ構造参照宣言（Repo構造準拠）

本ファイルは、3DSL プロジェクトの公式フォルダ構造定義の参照ポインタである。  
実際の構成は `/repo_structure.txt` に記載された内容を唯一の原本として採用する。

## 運用方針
- `/repo_structure.txt` が実際のリポジトリ構造および Codex 展開構造の唯一の基準である。
- Codex は `/meta/Q0_codex_dir_map.md` と `repo_structure.txt` の整合を自動チェックし、  
  差分がある場合 `/logs/codex/structure_diff.log` に記録する。
- `/meta/Q0_folder_structure.md` 自体は、構造差分を記録するためのメタ定義ファイルであり、  
  内容の直接編集は禁止とする。

## 構造参照先
参照原本： `/repo_structure.txt`  
最終更新： 2025-10-28  
ハッシュ署名： `<Codex 自動生成時に付与>`
