下に、こっちで動く変換スクリプト用意しといた。

Download xlsx→3DSS 変換スクリプト

Download csv→3DSS 変換スクリプト

Download document_meta テンプレ

（動作例）Download 変換結果サンプル

xlsx → 3DSS.json（points/lines 2シート）

前提：

points / lines シート

1行目=列キー（例 appearance.pos[0], meta.uuid）

4行目以降=データ（1行=1要素）

実行：

python xlsx_to_3dss.py --xlsx INPUT.xlsx --schema 3DSS.schema.json --out OUT.3dss.json


document_meta を自前で入れたいなら：

python xlsx_to_3dss.py --xlsx INPUT.xlsx --schema 3DSS.schema.json --meta-json document_meta.json --out OUT.3dss.json

csv → 3DSS.json

CSVはシート無いから points.csv と lines.csv を別ファイルにする想定。

python csv_to_3dss.py --points points.csv --lines lines.csv --schema 3DSS.schema.json --out OUT.3dss.json

変換のルール（重要なとこだけ）

列キーが a.b[2].c みたいな形式なら、そのままネスト/配列に復元

空セルは 出力に入れへん（キーごと省略）

*_json 列は中身を json.loads() して JSONとして格納（失敗したら文字列のまま）

meta.uuid が空なら 自動で uuid を発行（point/line は schema 的に meta.uuid 必須やから）

document_meta も未指定なら最低限を自動生成して入れる（validation通す用）

注意

vec3 みたいな固定長配列（pos[0..2]）は、必要数埋まってへんと スキーマ検証で落ちる（それでOKな挙動にしてる）

aux はこのスクリプトでは無視（必要なら aux シート追加して同じ処理を1個足すだけ）

「xlsxの3行目（説明行）から enum/制約も読んで、型変換もっと厳密にしたい」とか、「oneOf を mode 列で分岐したい」みたいな運用方針があるなら、それに合わせてスクリプト側を固めるで。



用意したやつ👇

Download json→xlsx 変換スクリプト

Download xlsx→json（document_meta対応版）

（動作例）
out_example_from_json.xlsx
points
lines
document_meta

（動作例）Download roundtrip 後のjson

json → xlsx（テンプレを使ってスタイル/validation維持）

前提：テンプレ 3DSS_points_lines_template.xlsx を使う（points/lines列が一致するから）

python json_to_xlsx.py --json INPUT.3dss.json --template 3DSS_points_lines_template.xlsx --out OUT.xlsx


points / lines シートに、jsonの要素を 1行=1要素で展開

さらに document_meta シートも作って、メタもExcel側で編集できるようにしてる

xlsx → json（metaも戻す）
python xlsx_to_3dss_v2.py --xlsx OUT.xlsx --schema 3DSS.schema.json --out BACK.3dss.json


document_meta シートがあればそれを使う（なければ自動生成）

*_json 列は JSON として parse（失敗したら文字列のまま）