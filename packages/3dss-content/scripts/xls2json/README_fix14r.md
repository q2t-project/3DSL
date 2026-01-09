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


````md
# 3DSS Excel IO（xls2json）

3DSS（3D Structural Schema）用の **Excel ⇄ JSON 変換ツール**。  
この Excel（.xlsm）は **下書き・編集用**であり、最終的な正当性はスキーマ検証で担保する。

---

## 位置づけ

- 本ツールは **制作途中データの入出力補助**
- 厳密な正規化・最適化・自動補完は目的外
- 「おかしな情報を下流（viewer / library）に流さない」ことを最優先

---

## 基本フロー

1. `in.3dss.json` を **Import**
2. Excel 上で編集
3. **Export** → `out.3dss.json`
4. 必要に応じて AJV で schema validate

```sh
npx ajv-cli@5 validate --spec=draft2020 --strict=false \
  -s 3DSS.schema.json -d out.3dss.json --all-errors
````

---

## ラウンドトリップ保証

以下が満たされていれば **IO として問題なし**：

```sh
py -c "import json;print(json.dumps(json.load(open('in.3dss.json','r',encoding='utf-8-sig')),ensure_ascii=False,indent=2,sort_keys=True))" > in.canon.json
py -c "import json;print(json.dumps(json.load(open('out.3dss.json','r',encoding='utf-8-sig')),ensure_ascii=False,indent=2,sort_keys=True))" > out.canon.json
git diff --no-index -- in.canon.json out.canon.json
```

* diff = 0 → 完全一致
* diff が出る場合も **意図した編集のみ**であること

---

## 設計方針（重要）

### 1. 空欄の扱い

* 空欄 = **未指定**
* 勝手に null / default を入れない
* 意図的に消したい場合は `__UNSET__`

### 2. partial データ

* relation kind / value などが片方だけの場合：

  * **raw_json を維持**
  * warning を出すが、破壊しない

### 3. warning の扱い

* warning は **UI 表示のみ**
* JSON 本体には影響させない
* 下流に異常データを流さないための注意喚起

### 4. touch_audit

* JSON 構造に実際の変更が入った場合のみ記録
* warning のみの場合は記録されない（仕様）

---

## frames / aux について

* `frames_json` / `aux` は **raw JSON 行単位**
* Import → Export で **diff が 0 になることを確認済**
* 解釈や意味付けは viewer / modeler 側の責務

---

## このツールでやらないこと

* schema の完全修復
* viewer 表示用の最適化
* 高度な自動補完
* 意味的な正誤判定

---

## 想定用途

* 3DSS コンテンツの下書き作成
* JSON を直接触りたくないケースの編集補助
* modeler / viewer に渡す前段階の素材生成

---

## 状態

* Import / Export：安定
* ラウンドトリップ：保証済
* **仕様凍結（これ以上手を入れない）**

---

## 注意

この Excel は **完成品を作る場所ではない**。
「下書きを安全に作るための作業台」である。

最終判断は必ず：

* schema
* modeler
* viewer

で行うこと。

```
