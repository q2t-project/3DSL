# 3DSS xlsx <-> json (fix14q)

## 目的
- Import → Export の直後に、**未編集なら JSON が勝手に増えたり変わったりしない**（round-trip 安定）
- Excel テンプレの **隠し列/右側列に残った古い値**が Export に混入する事故を潰す
- セルが `{...}` / `[...]` の **正しい JSON なら JSON として解釈**して出力する（配列が文字列化する事故を潰す）
- **空欄セルは「未指定（raw維持）」**として扱い、消したつもりでも JSON を勝手に削除しない

## 修正点（fix14n → fix14q）
### 1) localized（name_ja / name_en / caption_ja / caption_en）の上書き方法を「マージ」に変更
従来: `signification.name` 等を **新しい Dictionary で丸ごと置換**してたため、
- `name_ja` は埋まってる
- `name_en` を空欄にした（または先頭改行で空判定になった）
みたいな時に、**`en` が消える**ことがあった。

fix14q: 既存（raw）の `signification.name` を取得して、
- `ja` / `en` の **指定があるキーだけ**更新
- 空欄は **触らない（保持）**
に変更。

### 2) JSONセル判定のトリム強化を CellToJsonValueAny にも適用
`Trim()` は CR/LF/Tab/nbsp を落とさないので、先頭に改行があると `[` 判定が失敗し、JSON が文字列化することがある。

fix14q: `CellToJsonValueAny` も `TrimWs()` を使って判定→Parse。

### 3) 明示的に削除したい場合のトークン
Excel で「空欄＝raw維持」運用に寄せてるので、削除は明示トークンにする。
- `__UNSET__` : その JSON パス（または locale キー）を削除

例:
- `name_en` セルに `__UNSET__` → `signification.name.en` を削除
- `caption`（default）セルに `__UNSET__` → `signification.caption` を削除（caption が string 運用の場合）

## 反映手順
1. Excel(xlsm) を開く → VBE
2. 既存の IO モジュールを Remove
3. `3dss_xlsx_io_v4_fix14q.bas` を Import
4. デバッグ → VBAProject コンパイル
5. `Import3DSSJson_Run` 実行（in.3dss.json → sheet）
6. `Export3DSSJson_Run` 実行（sheet → out.3dss.json）

## AJV (draft 2020-12) で検証する例
ajv-cli は strict 既定だと `$anchor` などで引っかかることがある。

動作確認コマンド（PowerShell / このフォルダで実行）:
```
npx ajv-cli@5 validate --spec=draft2020 --strict=false -s .\3DSS.schema.json -d .\out.3dss.json --all-errors
```
