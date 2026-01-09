# fix14r

## 変更点
- **Export 時の Runtime error 450**（`ApplyLocalizedGroup` 内 `curV = JsonGetByPath(...)` で停止）を修正。
  - `JsonGetByPath(...)` が Dictionary/Object を返すケースで、Variant への `=` 代入が 450 を起こすことがあるため、
    **`JsonGetByPathAny(...)` 経由で Set/Let を自動分岐**するように統一。

## 影響
- Import はそのまま。
- Export で localized object（`name`, `caption` 等）のマージ処理が安定。

## 反映手順（いつもの）
1. zip 展開
2. Excel（xlsm）を開く → VBE
3. 既存の IO モジュール（`3dss_xlsx_io_*`）を Remove
4. `3dss_xlsx_io_v4_fix14r.bas` を Import
5. デバッガで **VBAProject をコンパイル**
6. Import/Export 実行

## メモ
- fix14o で出ていた「構文エラー」はこの版では含まない（`Private` 行の混入を避ける）。
3. 既存の IO モジュール（`3dss_xlsx_io_*`）を Remove
4. `3dss_xlsx_io_v4_fix14r.bas` を Import
5. デバッグ → **VBAProject のコンパイル**（構文エラーが無いことを確認）
6. Import/Export を実行

## 既知の注意
- AJV 2020-12 の CLI 検証は、手元の `ajv-cli` 環境に依存する。手元で通っているコマンド：
  - `npx ajv-cli@5 validate --spec=draft2020 --strict=false -s .\3DSS.schema.json -d .\out.3dss.json --all-errors`
