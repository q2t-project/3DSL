---
title: "3DSS とは"
summary: "3DSS は 3DSL が扱うシーンデータ（スキーマ）で、点・線・テキストなどを構造化して保存します。"
---

3DSS は 3DSL の中核データ形式や。ざっくり言うと「点（points）」「線（lines）」「表示（labels 等）」を JSON で扱えるようにしたもん。

- Viewer は 3DSS を読み込んで表示する
- Schema（`3DSS.schema.json`）で整合性をチェックできる
- Library / fixtures / canonical によって壊れたら検知できる

詳細は Docs（Schema / Contracts）側の説明も参照してな。
