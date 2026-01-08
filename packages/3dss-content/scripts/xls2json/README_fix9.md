# 3DSS xlsx template v3 (fix9)

## 変更点
- `in.3dss.json` を 3DSS.schema.json v1.1.1 に通るように修正
  - tags は schema 仕様に合わせて `s:` / `m:` / `x:` プレフィックス必須（例: `s:excel`）
- Export 側で tags のプレフィックス補完を追加
  - tags に `:` が無い場合は自動で `s:` を付けて出力
- points/lines シートの tags 例文を更新（`s:` 付き）

## バンドル内容
- 3dss_xlsx_template_v3.xlsx
- in.3dss.json（schema-valid サンプル）
- JsonConverter.bas
- 3dss_xlsx_io_v3.bas
- 3DSS.schema.json（参照用）
- validate_3dss_json.py（schema検証用）
