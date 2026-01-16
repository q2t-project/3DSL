# 3DSS xlsx ↔ json (v4 fix14m)

## この版で直したこと（fix14l → fix14m）

### 1) 「Import→何も触らずExport」で勝手にフィールドが増える問題を止めた
- 既存行（raw_json がある行）に対して **EnsureDefaults を適用しない** ようにした  
  → line に appearance.position/marker が生える、point に line_type/line_style が生える、などの “勝手な補完” を抑止

※ 新規行（raw_json 空）だけ、最小デフォルトを付与（従来どおり）

### 2) セルに JSON（配列/オブジェクト）を書いた場合は value_type が json じゃなくても parse する
- 先頭が `[` or `{` のセルは JSON と見なして parse  
  → marker.size が `"[\r\n1,...]"` みたいな **文字列化** になる事故を抑止

## ajv-cli で schema validate する（draft 2020-12）
3DSS.schema.json は `$schema: https://json-schema.org/draft/2020-12/schema` なので、ajv-cli には `--spec=draft2020` を付ける。

```powershell
# 例: このフォルダで
npx ajv-cli validate --spec=draft2020 -s .\3DSS.schema.json -d .\out.3dss.json --all-errors
```

## 反映手順（いつもの）
1. Excel (xlsm) を開く → VBE
2. 既存の IO モジュールを Remove
3. `JsonConverter.bas` と `3dss_xlsx_io_v4_fix14m.bas` を Import
4. コンパイル
5. Import / Export 実行
