# 3DSS xlsx ⇆ json（fix13 取りまとめ）

## 追加（fix13）
- `ui_visible` + `ui_group(core/detail/debug)` による **列の自動 hide/unhide**
- `README` シートに `UI_DETAIL_ON / UI_DEBUG_ON` のフラグ（NamedRange）を追加
- VBA に UI 用マクロを追加（列の表示モード切替）

## UI 列表示の考え方
- `mapping` には **入出力できる項目を列として定義**しておく（ただし raw_json がSSOT）
- Excel は **補助UI**なので、普段は必要最低限（core）＋必要なら詳細（detail）だけ見えるようにする
- debug は低頻度/高度な項目を「必要な時だけ」出すためのレーン

### mapping 列
`sheet, ui_key, json_path, type, group, ui_visible, ui_group, note`

- `ui_visible` : 1=UI列の候補（マクロが制御対象にする） / 0=常時非表示扱い
- `ui_group`
  - `core` : 常時表示
  - `detail` : `UI_DETAIL_ON=1` のとき表示
  - `debug` : `UI_DEBUG_ON=1` のとき表示

## 使い方（列の表示切替）
1) `README` シート右側の `detail_on / debug_on` を 0/1 で変更  
2) マクロ `UI_ApplyVisibility` を実行

よく使うマクロ：
- `UI_ToggleDetail` : 詳細 ON/OFF 切替
- `UI_ToggleDebug`  : debug ON/OFF 切替
- `UI_ShowCore`     : core のみ
- `UI_ShowDetail`   : core + detail
- `UI_ShowDebug`    : core + detail + debug

※ ボタンが欲しければ、Excel の「開発」→「挿入」→「ボタン」で上のマクロを割り当て。

## このバンドルに入ってるもの
- `3dss_xlsx_template_v3_fix13.xlsm` … テンプレ（mappingに ui_group追加 / 既定で debug列は非表示）
- `3dss_xlsx_io_v4_fix13.bas` … VBA（Import/Export + UI列表示マクロ）
- `3DSS.schema.json` / `3DSS.schema.zip` … 参照用
- 既存ファイル（fix12以前）… 比較用として同梱

## 既存方針（固定）
- Exportは rawベース差分上書き（空欄セル＝触らん＝raw_json保持）
- 低頻度項目は通常は隠す（raw_json で保持→Exportで維持）
- valid保証は 最終JSONを外部validator（viewer or AJV）でOK、Excelは中間状態も通す

## 追加（fix14）: debug時のみ auditログ出力（普段は軽い）

### 動作
- `UI_DEBUG_ON=1`（debug表示ON）のときだけ **Export時に auditログを生成**
- 監査ログは `touch_audit` シートに出力（A列 `json` に 1行1エントリ）
- Export開始時に `touch_audit` はクリア（同一Exportのログだけ残る）

### ログの考え方
- `before` は **raw_json（行内の原本）**
- `after` は **Exportで組み立てた node（差分適用後）**
- つまり「そのExportで実際に効いた差分」を記録する（イベント駆動の取りこぼしを避ける）

### touch_audit のJSONフィールド
- `ts` / `sheet` / `row_id` / `ui_key` / `json_path`
- `before_missing` / `before_json` or `before_preview` + `before_len` + `before_hash`
- `after_missing`  / `after_json`  or `after_preview`  + `after_len`  + `after_hash`

### サイズ制限
- `*_json` が長すぎる場合は preview/len/hash に退避してセル肥大化を回避する（上限は `AUDIT_VALUE_MAX`）

### 注意（意図）
- `relation_kind/value` の「片方だけ入力」は **raw維持＋警告**なので、audit には原則出ない（touched扱いにならない）
- `__UNSET__` は実変更扱いなので audit に出る

## 修正（fix14a）: GUID Declare/Type の配置
- `CoCreateGuid` などの `Declare` / `Type GUID` は VBA の仕様上、モジュール内の手続き（Sub/Function）より前に置く必要がある。
- これを満たすように `3dss_xlsx_io_v4_fix14.bas` の GUID 宣言ブロックをモジュール先頭へ移動（コンパイルエラー回避）。
