# Modeler 最小チュートリアル

目的：**最短で「開く → 触る → 反映（Apply） → 検査（QuickCheck） → 保存/出力 → Viewer で確認」**まで通す。

このチュートリアルは、Modeler の “編集フロー” を体験するための最小ルートです。仕様の詳細は `apps/modeler/ssot/3DSD-modeler.md` を参照してください。

---

## 0. 入口

- Site 経由：`/app/modeler`
- 比較ホスト：`/app/compare`（Viewer と Modeler を同時に開いて差分を見たいとき）

---

## 1. 既存モデルを開く

1. Top bar の **Open…** を押す
2. 例：リポジトリ同梱の fixture を選ぶ（Golden / regression / valid など）

ポイント：

- Open 直後は **dirty = clean**（未変更）で始まる
- 変更した瞬間に dirty になる（＝保存/破棄が必要な状態）

---

## 2. Point を 1つ編集する

1. 左の Outliner で `points` を選ぶ
2. 任意の point 行をクリックして選択
3. 右の Property で次を編集：
   - `name`（表示名）
   - `position`（x/y/z）
   - `frames`（必要な場合）

編集後、

- **Apply**（反映）を押す

### 期待する挙動

- Apply 前：Property は “未適用” の状態（draft）
- Apply 後：Core に反映され、Undo/Redo 単位として扱われる

---

## 3. Line を 1本追加する（できる最小）

1. Outliner で `lines` を選ぶ
2. **+lines** を押して line を追加
3. `end_a` / `end_b` を設定（point の uuid 参照）
4. 必要なら `frames` を設定
5. **Apply**

---

## 4. QuickCheck で壊れていないか確認する

1. Preview 下（または所定位置）の **QuickCheck** を開く
2. Issue が出たら、行をクリックしてフォーカス/選択が飛ぶことを確認

最低限の合格ライン：

- クリック → 対象が選択され、視点/アウトライナが追従する
- 同じ Issue を連打しても UI が取りこぼさない

---

## 5. 保存と出力

### Save / Save As

- **Save**：同じ保存先へ上書き
- **Save As…**：保存先を明示して保存

### Export 3DSS

- **Export 3DSS** は “出力”
- Export は dirty を解消しない（＝保存とは別扱い）

---

## 6. Viewer で確認する

1. 出力した `.3dss.json` を Viewer で開く
2. 追加/編集した point/line が見えることを確認
3. （可能なら）`/app/compare` で Viewer/Modeler を並べて挙動差分を確認

---

## よくある詰まりどころ

### dirty の意味が分からなくなった

- 迷ったら：
  1) Apply（編集内容を Core へ反映）
  2) Save / Save As（ファイルへ保存）
  3) QuickCheck（破損検知）

### frames が無い/編集できない

- points / lines ともに `frames` が必要な場合があります（モデル仕様に依存）。
- 仕様は `apps/modeler/ssot/3DSD-modeler.md` を参照。
