# 3DSS Excel IO（fix14r）使い方メモ（凍結版）

このフォルダ一式は **「下書き用のExcelテンプレ ↔ 3DSS JSON」** の往復を、最低限“変なデータを下流へ流さん”こと最優先で回すためのやつや。

- Import（JSON → Excel）/ Export（Excel → JSON）とも **fix14r で安定**
- `xls2json` 周り（VBA本体/仕様）は **ここで凍結**（以後は不具合以外いじらん）

---

## 1. 同梱物

- `3dss_xlsx_io_v4_fix14r.bas`  
  Excel（xlsm）に Import するVBAモジュール本体
- `3dss_xlsx_template_v3_fix14r_text.xlsm`  
  fix14r向けテンプレ（points に text 表示系カラム追加済）
- `README_fix14r.md`（このファイル）

---

## 2. 反映手順（いつもの）

1) テンプレ（`3dss_xlsx_template_v3_fix14r_text.xlsm`）を開く  
2) `Alt+F11` → VBE を開く  
3) 既存IOモジュールを Remove（同名が残らんように）  
4) `3dss_xlsx_io_v4_fix14r.bas` を Import  
5) デバッグ → `VBAProject` をコンパイル  
6) `Alt+F8` から  
   - `Import3DSSJson_Run`（in.3dss.json 読み込み）  
   - `Export3DSSJson_Run`（out.3dss.json 書き出し）

---

## 3. 重要ポリシー（“下流を汚さない”）

### 3.1 既知の落とし穴：Excelセルの「JSONっぽい文字」
- セルに `[...]` / `{...}` が入ってると、VBA-JSONが Dictionary/Collection を返す
- それを `cur(name)=v` みたいに **代入（Let）** すると 450 が出る
- fix14r では **ObjectはSet / ScalarはLet** に寄せて、Import/Exportとも 450 を潰してる

### 3.2 “空欄”の扱い
- 空欄は「消す」扱いにすると、意図せず情報が落ちる  
- fix14r は基本 **空欄＝触らない（raw維持）** 寄り
- 明示的に消したい場合は、対応してるカラムでは `__UNSET__` を使う（※対応してない所は触らん）

### 3.3 Warning と touch_audit
- **warning はメッセージ表示**はする  
- ただし **touch_audit には“変更”だけ記録**する（warningだけは記録しない）
  - 理由：audit を「差分ログ」として汚さないため  
  - warning の内容は export ダイアログに残るので、そっちで確認する運用

---

## 4. points: “TEXT表示”のためのカラム追加（今回の要点）

「意味（signification.name）」と「表示（marker.text）」は別物や。  
ビューア側で **文字をどう出すか** は `appearance.marker.text` を見に行く想定になる。

points シートに以下を追加してある：

- `marker_text_content` → `appearance.marker.text.content`（string）
- `marker_text_font` → `appearance.marker.text.font`（string）
- `marker_text_size` → `appearance.marker.text.size`（number）
- `marker_text_align` → `appearance.marker.text.align`（string）
- `marker_text_plane` → `appearance.marker.text.plane`（string）

運用のコツ：
- `marker_text_content` を空欄なら、ビューア側は `signification.name` をフォールバックにしてもええ（実装側判断）
- `font/align/plane` も未指定（空）なら、ビューア側デフォルトでOK

---

## 5. JSON検証（Ajv）

手元の `ajv-cli@5` で draft2020 を使うとき、環境によって strict が噛むことがある。  
とりあえず動かすならこれでええ：

```powershell
npx ajv-cli@5 validate --spec=draft2020 --strict=false -s .\3DSS.schema.json -d .\out.3dss.json --all-errors
```

---

## 6. いま残ってること（凍結前提で“運用側”に寄せる）

- **テンプレ側のカラム整備**（必要なものだけ増やす）
  - 今回：points の text 表示系を追加（完了）
  - 逆に gltf 系は低頻度なので、当面は空欄運用 or aux/raw_json で直書きでOK
- **サンプルデータ**（frames入り等）を増やして往復diffゼロを確認（運用タスク）

※ VBA（xls2json）自体は凍結。追加要望はまず「テンプレの列＋mappingで吸えるか」で対応する。

