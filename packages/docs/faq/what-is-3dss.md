---
title: "3DSSとは"
summary: "3DSSは点・線・文字などの図をJSONで記録する形式です。作品一式の原資料や草稿とは保存範囲が異なります。"
---

3DSS（Three-Dimensional Structural Schema）は、点（`points`）、線（`lines`）、補助要素（`aux`）、図の情報（`document_meta`）をJSONで記録する形式や。図だけのファイルには `.3dss.json` を使う。

Viewerで開いて図を読めるけど、作品一式 `.3dsl-work.json` の原資料や草稿などは、図だけの書出しには含まれへん。制作の続きはModelerで作品一式を保存してな。

JSON Schemaは型や必須項目などの形式を検査するものや。図の分類や主張に根拠があるかは、出典や作品の解説を別に確かめる必要がある。

[3DSSの概要](/docs/overview/what-is-3dss/) ／ [仕様とスキーマ](/docs/) ／ [保存形式の違い](/docs/usage/create-save-read/)
