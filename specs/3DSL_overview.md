# 3DSL Overview

本書は 3D Structural Language (3DSL) の全体像を示す。

3DSL は、人間とAIが三次元的に構造を共有するための共通言語体系であり、  
以下の主要要素から構成される。

- **3DSS (3D Structural Schema)**  
  データ構造を定義するスキーマ。  
  ノード、エッジ、テキスト、補助要素、外部モデル参照をJSONで規定する。

- **3DSD (3D Structural Diagram)**  
  図式表現。3DSSに基づき描画され、Viewer/Modeler がこれを扱う。  

- **Viewer / Modeler**  
  - Viewer: 3DSDを表示・ナビゲーションするアプリケーション  
  - Modeler: 3DSDを編集・生成するアプリケーション  
  どちらも 3DSS/3DSD に準拠することで互換性を保つ。  

- **Meta 文書群**  
  運用ルール、進行管理、テスト計画、CI/CDなど。  

---

## 関係図（概念フロー）

[3DSL Overview & Principles]
↓
[3DSS Schema]
↓
[3DSD Diagram]
↙ ↘
[Viewer] [Modeler]

---

## 全体構造と役割

- **3DSS_spec.md**  
  データ構造規範の定義。  

- **3DSD_core_spec.md / 3DSD-viewer_spec.md / 3DSD-modeler_spec.md**  
  アプリケーション固有の仕様と共通基盤。  

- **Viewer/Modeler 実装**  
  GitHub Pages で公開可能な静的アプリケーション。  

- **Support**  
  サンプルJSON、図表、補助ドキュメント。  

- **Meta**  
  内部運用ルールと進行管理ファイル。  

---

## 公開と互換性

- 3DSL に準拠する限り、異なる Viewer/Modeler 間でも互換性が確保される。  
- サンプルや図表は規範文書の理解を助ける補助資料であり、規範そのものではない。  
- 公開時は GitHub Pages を用いることを標準とする。  