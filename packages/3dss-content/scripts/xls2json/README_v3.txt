3DSS XLSX <-> JSON (v3) 使い方

1) /mnt/data/3dss_xlsx_template_v3.xlsx を開く
2) 「ファイル → 名前を付けて保存」で .xlsm で保存（例: 3dss_xlsx_template_v3.xlsm）
3) VBA エディタ (Alt+F11)
   - 既存の Module1 / 旧 3dss_xlsx_io_* があるなら削除
   - JsonConverter.bas をインポート
   - 3dss_xlsx_io_v3.bas をインポート
4) 3dss_xlsx_template_v3.xlsm と同じフォルダに in.3dss.json を置く
5) マクロ実行
   - Import3DSS_JSON: in.3dss.json → シートへ展開
   - Export3DSS_JSON: シート → out.3dss.json を出力

ポイント
- points/lines は row1 の「列キー」で処理する。列の並び替えOK（列キー文字列は変えたらアカン）。
- tags_json / geometry_json は「JSON文字列」を貼る（例: ["tag1","tag2"]）。
- frames は整数(例: 3) か JSON配列(例: [1,2]) を入れられる。
- points は x,y,z が必須。lines は end_a と end_b を ref か coord のどっちかで必須。

エラーの見分け
- Import/Export は MsgBox に stage と row を出すようにしてある。
