# 3DSS Excel IO (xlsm <-> json) — fix14r

Excel（.xlsm）で 3DSS を「下書き」編集し、`in.3dss.json` をシートに展開（Import）、編集後に `out.3dss.json` を生成（Export）するための最小ツール。

このディレクトリ（`packages/3dss-content/scripts/xls2json/`）は **凍結（fix14r）** とし、運用保守で迷わんように、使い方・制約・検証手順だけをここに集約する。

---

## できること

- **Import**: `in.3dss.json` → `document_meta / points / lines / aux` シートに展開
- **Export**: シート → `out.3dss.json` 生成
- **touch_audit**: Export 時に、シート編集が JSON にどう反映されたか（差分）をログ（1行=1レコードの生JSON）

※ これは「下書き」用。スキーマの全項目をスプレッドシートで完全網羅する思想ではない（重要項目は順次追加していく）。

---

## 同梱物

- `3dss_xlsx_template_v3_fix14r.xlsm` : テンプレート（シート・見出し込み）
- `3dss_xlsx_io_v4_fix14r.bas` : IO 本体（Import/Export）
- `JsonConverter.bas` : VBA-JSON（依存）
- `3DSS.schema.json` : 検証用スキーマ（同梱版）
- `samples/in.3dss.json` : 最小サンプル

---

## 反映手順（Excel側）

### 1) Excel（.xlsm）を開く

`3dss_xlsx_template_v3_fix14r.xlsm` を開く。

### 2) VBE でモジュールを入れる

1. `Alt+F11` → VBE
2. 既存の同名モジュールがあれば Remove
3. `JsonConverter.bas` を Import
4. `3dss_xlsx_io_v4_fix14r.bas` を Import
5. `Debug > Compile VBAProject` でコンパイル

### 3) Import

マクロ:

- `Import3DSSJson_Run` … 既定: **ブックと同じフォルダ**の `in.3dss.json`
- `Import3DSSJson_PickFile` … ファイル選択して Import

### 4) Export

マクロ:

- `Export3DSSJson_Run` … 既定: **ブックと同じフォルダ**に `out.3dss.json`
- `Export3DSSJson_PickFile` … **保存先を選んで** `*.json` として出力

---

## シート構成

- `document_meta`
  - 1列目=key、2列目=value
  - value は文字列/数値/null/JSON（`{...}` や `[...]`）を許容

- `points`
  - 1行目=ヘッダキー、4行目以降=データ

- `lines`
  - 1行目=ヘッダキー、4行目以降=データ

- `aux`
  - A列 `json` に **1行1要素の生JSON**（ここはスプレッドシートで構造化しない）

- `touch_audit`
  - Export 時に追記されるログ

---

## points の text 表示（重要）

point のマーカーとしてテキストを使う場合、以下の列で制御する。

- `marker_text_content` : 表示文字列
- `marker_text_font` : フォント名
- `marker_text_size` : フォントサイズ（数値）
- `marker_text_align` : 例 `left/center/right`（実装が許す範囲）
- `marker_text_plane` : 例 `xy/yz/zx`（実装が許す範囲）

※ このツールは「列が空なら出力しない」を基本にしてる。空欄は勝手に既定値で埋めん。

---

## __UNSET__ と null と空欄

- 空欄: **そのフィールドは触らない/出力しない**（= 下流に余計な値を流さない）
- `null`（文字列）: JSON の `null` として出力
- `__UNSET__`: そのフィールドを **削除**（存在してたものを消したい時）

※ localized（`name.ja` / `name.en` など）は「部分更新」。空欄は消さない。

---

## warnings について（partial relation 等）

`lines` の relation が片側だけ（kind/value のどちらか欠け）など、スキーマ的に危ない状態は:

- Export は止めずに **raw_json を維持**（勝手に解釈して改変しない）
- 画面に Warning を出す

`touch_audit` は「値の反映ログ」優先のため、Warning そのものは記録対象外。
（ログを肥大化させず、下流に変な値を流さない方を優先）

---

## バリデーション（AJV）

このリポジトリのスキーマは draft 2020-12。`ajv-cli@5` で検証する場合の例:

```powershell
npx ajv-cli@5 validate --spec=draft2020 --strict=false -s .\3DSS.schema.json -d .\out.3dss.json --all-errors
```

`--strict=false` は `$anchor` 等で strict に引っかかるのを避けるため。

---

## 運用メモ

- これは「下書き」用。`aux` は raw json で逃がす（= 重要）
- まずは **「変な記録が下流に流れない」** を最優先にする
- diff は、canon 化して `git diff --no-index` で確認するのが一番早い

---

## 既知の制約

- Excel の UI / 互換性の都合で、すべてのスキーマ項目を列に展開してない
- `gltf_*` 系は頻度が低いので、当面は raw json（aux）や直編集で十分

---

## ディレクトリ方針（凍結）

- **fix14r 以外の過去ファイルは `history/` に隔離**（作業中に間違って掴まんため）
- 生成物（`out.3dss.json` / `*.canon.json` など）は **コミットしない**（必要なら手元で管理）

---

## 付属ツール（任意）

`tools/` は補助スクリプト置き場（運用必須ではない）。

- `validate_3dss_json.py`: Python で軽く JSON として読めるかチェック
- `xlsx_to_3dss*.py` / `json_to_xlsx.py`: 旧実験（現状は VBA ルートが本線）


