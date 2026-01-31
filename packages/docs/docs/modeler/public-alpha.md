---
title: Modeler Public Alpha
---

# Modeler Public Alpha（試験公開）
- 検索エンジン向けの `noindex` は **Public Alpha（M1）期間のみ**。外すのは **Public Beta（M2）到達後**（もしくは Stable 公開時）に固定する。

このページは **3DSL Modeler（/app/modeler）** の試験公開向け案内です。  
SSOT: `packages/docs/docs/modeler/`（サイト側は sync によるミラーです）。

## できること（現時点）
- point/aux/line の選択・移動（Move）
- Property 編集 → Apply / Discard（未適用 dirty）
- Save / Save As / Export（ローカル保存）
- QuickCheck（issue）→ focus（選択＋視点＋アウトライナ可視範囲）
- Preview Out（別ウィンドウ表示）

## 重要（データと保存）
- **ブラウザ上で編集しても自動保存はされません。**
- **Save / Save As** は 3DSS(JSON) を **ローカルに保存**します。
- **Export** は書き出し専用で、dirty を解消しません（仕様）。
- 迷ったら：**Discard**（未適用編集を破棄）→ **Save As**（別名保存）。

## 既知の制限（Public Alpha）

- ブラウザ差（iOS Safari の Save/SaveAs など）：[beta-io](/docs/modeler/beta-io)
- Safari など一部ブラウザでは、保存ダイアログや挙動に差があります。
- 仕様・UIは更新されます（設定項目の追加/変更、保存形式の拡張など）。
- glTF marker 等の拡張は、公開版では未保証です（現時点）。

## 推奨ワークフロー（最短）
1. /app/modeler を開く  
2. サンプルを読み込む（または既存3DSSをOpen）  
3. 1点を Move で動かす → Apply  
4. Save As で保存  
5. QuickCheck で issue を潰す（必要なら focus で該当箇所へ）

## フィードバック
不具合・改善点は、再現手順（OS/ブラウザ/操作手順/対象ファイル）を添えて共有してください。

## インデックス方針（検索エンジン）
- Public Alpha（本段階）：**noindex を維持**
- **Public Beta 到達時に noindex を解除**（機能と編集体験が安定した段階）
- Stable：index 前提（SEO/公開導線を正式化）

## iOS Safari / ブラウザ差分（Beta基準）

### Save / SaveAs / Export
- **File System Access API が使える環境（Chrome / Edge）**
  - Save = 上書き保存
  - SaveAs = 新規保存
- **使えない環境（iOS Safari 等）**
  - Save = Download 扱い（上書き不可）
  - SaveAs = Download 扱い
  - Export = 常に Download

※ iOS Safari では「保存＝ダウンロード」になる。ローカル上書きは保証しない。

### Preview Out（別ウィンドウ表示）
- Popup がブロックされた場合は **失敗として扱わず**、
  - ガイド表示（ポップアップ許可の案内）
  - 代替として **同一タブ内 Preview 切替** を提示する
- Beta期間中は **試験機能**扱いとする
