# 3DSS xlsx ⇆ json（fix12 取りまとめ）

## 目的
- **xlsx は編集UI**（よく触る項目だけを列として出す）
- **raw_json を必ず保持**して、xlsxに出してない/隠してる項目は壊さずそのまま戻す
- Export は **rawベース差分上書き**に統一する（触ったところだけ反映）

## 警告（Exportは止めない）
- xlsxは中間編集も許容する方針のため、**不整合は警告として通知**しつつ Export 自体は継続する。
- 例：`relation_kind` / `relation_value` が **片方だけ入力**されている場合  
  → **raw_json の `signification.relation` を維持**（出力は壊さない）  
  → Export 完了メッセージに **Warnings** として行番号つきで表示

## このバンドルに入ってるもの
- `3dss_xlsx_template_v3_fix10.xlsm` … テンプレ（points/lines/aux/mapping）
- `3dss_xlsx_io_v4.bas` … VBAモジュール（Import/Export）
- `3DSS.schema.zip` / `3DSS.schema.json` … 参照用（validatorはExcel側に組み込んでない）
- `3dss_xlsx_template_v3_bundle_fix9.zip` … 前回配布物（比較用）

## シート構成（fix10テンプレ + fix12 VBA）
- `points` / `lines`
  - 1行目：UI列ヘッダ（**スキーマの生キーではなく UI用**。mappingで対応付け）
  - `raw_json`：その行の要素1個ぶんの生JSON（Import時に格納）
  - `touch_mask`：Export時に生成される「どこを上書きしたか」の記録（デバッグ用）
- `aux`
  - A列 `json` に **1行1要素**の生JSON
- `mapping`
  - `sheet, ui_key, json_path, type, group, ui_visible, note`
  - `ui_key` ⇆ `json_path` をここで固定
  - `ui_visible=1` のものが「使う頻度高い＝表に出す候補」。0は隠し扱い（ただし raw_json に残る）
- 重要：VBAは `type` と `ui_key` から処理を推定する（`json`/`tags_json` は JSON として解釈、`frames_json` はフレーム用パース）。
- `group` 列は現状「分類/メモ」扱い（表示整理用）。

## Export時の「空欄セル」扱い
- **空欄 = 触らん**（raw_json の値を保持）
  - つまり「空欄にした＝値を消したい」にはならん

## null を入れたい／値を消したい
- **nullを明示したい**：セルに `null` と入力（typeが number/string/bool でも null にできる）
- **プロパティ自体を消したい**：セルに `__UNSET__` と入力（その json_path を削除）

## 破綻せんフロー（運用）
1. **Import**（JSON → xlsx）
   - ここでは **バリデーションしない**（中間状態で壊れてても通す）
   - raw_json に原本が残るので、xlsx側の列が足りなくても情報は保持される
2. xlsxで編集（頻出項目だけ）
3. **Export**（xlsx → JSON）
   - 行ごとに raw_json をベースに、**空欄以外のセルだけ差分上書き**
4. 最後に **外部でvalidator**（viewer か AJV 等）
   - validにしたいのは「最終JSON」だけでOK

## 既知の前提／制約
- xlsx側の列は「UI都合」で絞ってる。スキーマ全量を列にしてない。
- 出してない項目は raw_json に保持され、Exportでそのまま残る。

## 次の作業（TODO）
- schemaに合わせて mapping の json_path を最終確定（現状は fix10 叩き台）
- points/lines の「頻出」列セットを確定（ui_visible と合わせて）
- Export後のJSONを、同梱の `3DSS.schema.json` で AJV 検証するチェック手順を整備（Excel外）