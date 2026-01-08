3dss_xlsx_template_v3_bundle_fix7

目的:
  - Excel(xlsm) に VBA-JSON(JsonConverter.bas) + 3DSS I/O(3dss_xlsx_io_v3.bas) を取り込んで
    in.3dss.json -> シート展開 / シート -> out.3dss.json を行う。

fix7で直した点（ここが本丸）:
  - 「構文エラー」が Put ws, ... で出るのは、VBAの予約語 Put（ファイルI/O文）と衝突してるから。
    → 3dss_xlsx_io_v3.bas 内の手続き名を Put → PutCell に改名し、全呼び出しも置換済み。

手順（これで通る）:
  1) Excelでテンプレを開いて「別名で保存」して .xlsm にする（マクロ有効）
  2) Alt+F11 でVBEを開く
  3) 既存のモジュールが残ってたら削除:
       - JsonConverter
       - mod3dss_xlsx_io_v3（または似た名前の3dss_xlsx_io_v3）
  4) File -> Import File... で、このzipの
       - JsonConverter.bas
       - 3dss_xlsx_io_v3.bas
     を取り込む
  5) Debug -> Compile VBAProject でコンパイル（ここが通れば勝ち）
  6) ブックと同じフォルダに in.3dss.json を置く
  7) マクロ Import3DSS_JSON を実行

出力:
  - Export3DSS_JSON を実行すると、同フォルダに out.3dss.json を出す。

まだ詰まる場合:
  - エラーが出た行をそのまま貼って（スクショじゃなく行テキストでもOK）
  - VBEの「ツール -> 参照設定」は触らんでOK（fix7は参照設定不要のlate-binding前提）


fix8:
  - VBAの予約語 Put と衝突して構文エラーになっていた残りの `Put ws, ...` 呼び出しを全て `PutCell ws, ...` に置換。
  - もしまだ構文エラーで `Put ws` がハイライトされるなら、VBE内に古いモジュールが残っているので、JsonConverter / mod3dss_xlsx_io_v3 を一旦RemoveしてからImportし直してな。
