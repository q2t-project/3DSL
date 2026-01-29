# Selection / Focus Contract (Modeler)

このドキュメントは **UIの発火点（pick / outliner / quickcheck / undo-redo）** が起きたときに、
**何が「必ず」同期されるべきか** を固定するための契約です。

対象：Modeler UI（`apps/modeler/ssot/ui/**`）と Hub/Core/Renderer の境界。

## 用語
- **selection**: 選択中の要素UUID配列（通常は単一選択、複数選択あり）
- **focus**: ある要素へ「視点＋UI」を寄せること（selection を伴う）
- **issueLike**: QuickCheck等から来る `{ uuid?, kind?, path? }`

## 入口（UI発火点）と必須の結果

共通（すべての入口）：
- **selection** が変更されたら、Property/Preview/Outliner は最新の selection と doc に整合する（取りこぼしゼロ）。
- **focus** が発火したら、同一選択であっても Outliner の reveal+flash は必ず走る（視認性の保証）。

### 1) Preview pick（キャンバス上クリック）
入口：
- `uiCanvasController` → `uiSelectionController.selectFromPick(issueLike, ev)`

必須結果：
- selection が更新される（複数選択修飾：ctrl/cmd toggle）
- 単一選択なら `core.focusByIssue({uuid, kind?, path?})` が呼ばれる
- Property は selection の内容へ同期（単一なら該当要素の編集UI、複数なら閉じる）
- Outliner は該当行を可視化＋フラッシュ（selection 変更が無い場合でも focus イベントで保証）

### 2) Outliner クリック
入口：
- `UiOutlinerController.onRowSelect(issueLike, ev)` → `uiSelectionController.selectFromOutliner(...)`

必須結果：
- selection が更新される（shift範囲選択 / ctrl/cmd toggle）
- 単一選択なら focus が発火する
- Property は selection の内容へ同期（単一/複数ルールは共通）

### 3) QuickCheck issue クリック
入口：
- `uiToolbarController`（QuickCheck）→ `uiSelectionController.selectIssue(issueLike)` → `core.focusByIssue(issueLike)`

必須結果（uuid/pathどっちでも）：
- issueLike を解決して **uuid を確定**（uuidが無ければ path→uuid 解決）
- selection を確実に単一選択へセット
- focus イベントにより
  - 視点（renderer.focus / camera）更新
  - Outliner 可視化＋フラッシュ
  - Property は該当要素へ同期（必要なら issue の field へ誘導）

※「同じuuidの再クリック」でも **focus イベントでUI更新が起きる**こと。

### 4) Undo / Redo
入口：
- core edit undo/redo

必須結果：
- document が更新される
- 現 selection の要素が doc 上で無効になった場合は selection が prune される
- Property/Preview は最新docと整合（選択が同一でも値は必ず更新）

## 未適用dirty（Property）と selection 変更のガード
- selection を変える入口（pick/outliner/quickcheck）は **必ず** `ensureEditsAppliedOrConfirm({reason})` を通す
- ガードの結果：
  - Apply / Discard / Cancel のいずれかが確定するまで selection は変わらない（Cancelなら元に戻す）

## 参照（コード内リンク）
各UI発火点にはこのドキュメントへのリンクコメントを付与する：
`packages/docs/docs/modeler/selection-contract.md`
