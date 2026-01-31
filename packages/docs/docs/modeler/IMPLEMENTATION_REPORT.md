# Modeler 実装状況レポート（Spec/Manifest 差分 + From-now プラン）

- Last updated: 2026-01-31
- Repo snapshot: `3DSL_repo_20260131_000621.zip`
- 対象 SSOT
  - 実装: `apps/modeler/ssot/**`
  - 仕様書（human spec）: `apps/modeler/ssot/3DSD-modeler.md`
  - 境界/依存ルール（manifest）: `apps/modeler/ssot/manifest.yaml`

---
## 2026-01-31 — M2: 選択同期/QuickCheck/frames/Save-Export 固め

### DONE（アクションプラン A〜D）
- A: QuickCheck
  - 右ペイン固定（レイアウト非破壊）＋折りたたみ（summary常時）
  - 行クリックは `uiSelectionController` 経由に統一（同一行連打でも outliner flash）
  - Follow=ON のときだけ PreviewOut で framing（OFF は視点不変）
- B: frames 編集（Property）
  - `appearance.frames` を points/lines/aux で編集可能（入力→正規化）
  - Undo/Redo / dirty / Save/SaveAs の粒度が破綻しない
  - QuickCheck に frames 型不正チェックを追加（number or number[] / 整数のみ）
- C: 選択同期 “取りこぼしゼロ”
  - Outliner / PreviewOut pick / QuickCheck / UndoRedo / Open 入口を SSOT 経路に統一
  - doc更新・Undo/Redo で stale selection を掴まない（pruneを統一）
  - Undo/Redo の history が確実に積まれるよう core の `updateDocument()` 契約を拡張（in-place mutator を許容）
- D: Save/SaveAs/Export UX 固め
  - Save/SaveAs 成功で clean、Export は dirty を解消しない
  - Save/SaveAs/Export は同時実行ガード（連打でも壊れない）
  - iOS Safari 対策：ユーザー操作起点を維持する “先に空タブ確保→blobへ遷移” 方式を実装（実機未検証）

### 決定事項（SSOT）
- Modeler は編集快適性最優先。見映え品質は Viewer で担保。
- PreviewOut は main レイアウトに干渉しない（resize/size要求を混ぜない）。
- QuickCheck は “位置固定（右ペイン）＋内容折りたたみ” を正とする。

---
## 2026-01-30 — 生成物混入（apps/site/public ミラー）ガード強化

### 変更点（決定事項）
- `apps/site/public/**` のミラー（`modeler_app/`, `_data/`, `schemas/`, `vendor/` など）を **Git 追跡しない**運用へ統一。
- 誤追跡を検知する check を **CI で落ちるガード**として維持（`check:generated-clean`）。

### 具体対応
- 誤って追跡されたミラーを `git rm --cached` で index から除外し、`.gitignore` に明示。
- vendor の `three/examples/jsm/**` を更新する手順を docs へ固定（`packages/docs/docs/ops/vendor_update.md`）。

### 期待効果
- SSOT 二重化（= 手戻りの温床）を機械的に封じる。
- sync で再現できる生成物は repo を汚さず、レビュー差分を「SSOT側の変更」に限定できる。


## 0. 結論（要点）

- **境界/ports 準拠**：manifest の依存方向と ports はチェック済みで OK。
  - `node apps/modeler/ssot/scripts/check-forbidden-imports.mjs` → OK
  - `node apps/modeler/ssot/scripts/check-ports-conformance.mjs` → OK
  - `node apps/modeler/ssot/scripts/check-single-writer.mjs` → OK
  - `node apps/modeler/ssot/scripts/check-generated-clean.mjs` → OK

- **仕様との差分**：実装が先行している主要点は次。
  - Preview Out（二面表示/外部表示）まわり（独立ビュー、フォーカスモード、外部ウィンドウからの Pick 等）
  - Dirty state と Save/SaveAs/Export の扱い（Export 成功で clean、未適用編集＝別 dirty など）

- **今回の方針**：実装先行分は spec に取り込み（この snapshot では spec を改訂）、以後このレポートを更新し続ける。

---

## 1. 現状実装の構成（SSOT 実体）

### 1.1 レイヤー配置（manifest に対応）

- host: `apps/modeler/ssot/index.html`, `modelerHost*.js`, `modeler.css`
- entry: `apps/modeler/ssot/runtime/bootstrapModeler.js`
- hub: `apps/modeler/ssot/runtime/modelerHub.js`
- core: `apps/modeler/ssot/runtime/core/coreControllers.js`（`coreFacade.js` は互換 alias）
- renderer: `apps/modeler/ssot/runtime/renderer/modelerRenderer.js`
- ui: `apps/modeler/ssot/ui/**`（shell + controllers）

Ports は `apps/modeler/ssot/_generated/PORTS.md` が SSOT（manifest から生成）。

### 1.2 Preview Out（二面表示）

- 外部ウィンドウ: `apps/modeler/ssot/preview_out.html` + `previewOutBoot.js`
- メイン側の制御: `apps/modeler/ssot/ui/controllers/uiToolbarController.js`
- メイン canvas の外部表示サイズ追従: `apps/modeler/ssot/ui/controllers/uiCanvasController.js`

---

## 2. Spec / Manifest 差分（実装先行 → spec 追従が必要）

> ここは「仕様が遅れている」項目。差分が見えるように、実装根拠（ファイル）と spec 反映先を併記。

### 2.1 Preview Out（二面表示/外部表示）

**実装で入っていること（根拠）**
- 既定は **Independent view**（外部ウィンドウ独立カメラ + fallback renderer）
  - `previewOutBoot.js` が常に fallback renderer を起動し、外部ウィンドウが真っ黒にならないようにしている
- 外部ウィンドウには overlay（タイトル/選択ラベル）と操作（Follow / Frame / Pick）がある
- 外部ウィンドウからの Pick は、Pick を ON にした場合のみ main window に selection を返す
- （実装は存在）mirror モード: `preview_out.html?mirror=1` で captureStream によるミラーを試みる
  - autoplay ブロック時は fallback のまま運用し、ユーザー操作で retry する
- 追加の UI：focus-mode（preview out 有効時に、メイン内の preview pane を折りたたむ）
  - `uiToolbarController.js`（localStorage `modeler.previewOut.focusMode`）
- 追加のレンダリング：preview out 側のウィンドウサイズ要求をメイン側へ伝播し、
  メイン側は「埋め込み preview が小さくても、外部表示をシャープに保つ」ため **大きい方**に合わせて描画サイズを確保する
  - `uiCanvasController.js`（`__modelerPreviewOutWantedSize`）

**spec 反映先（今回反映）**
- `3DSD-modeler.md` に Preview Out セクションを追加
- Preview Out を前提にした resize（外部サイズ要求をメインレンダラに反映）を仕様化

### 2.2 Dirty state（core dirty / 未適用 dirty）と Save/Export ポリシー

**実装で入っていること（根拠）**
- core の “適用済み変更” と、property panel の “未適用編集（unapplied）” を分離している
  - toolbar は `propDirty` がある間は Save/Export を無効化（誤保存防止）
- `beforeunload` は「core dirty + 未適用 dirty」をまとめてガードする（破棄防止）
- Save/SaveAs/Export は **strict validate 成功が必須**。失敗時は QuickCheck に schema エラーを出してブロックする
- Export 成功は **clean に戻す**（policy）
  - ※ただし Save の保存先（handle/label）とは独立で、Export は save destination を更新しない

**spec 反映先（今回反映）**
- `3DSD-modeler.md` に Dirty state ポリシーを追加
- Save/SaveAs/Export の clean ルール（Export も clean）を明記


### 2.3 Import 寛容化（raw → strictDoc + extras）

**実装で入っていること（根拠）**
- Open 時に `core.import.normalize(raw)`（`importNormalize`）を通し、schema が拒否する additional fields を **strictDoc から除去**して extras に退避する
  - `runtime/core/coreControllers.js`（Ajv `removeAdditional:"all"` で prune）
- extras は **QuickCheck に info として表示**する（出力 JSON には混ぜない）
  - `runtime/core/coreControllers.js`（QuickCheck に `/__import_extras` を追加）

**spec / manifest 反映先（今回反映）**
- `3DSD-modeler.md` の起動フロー / I/O を `importNormalize` 前提に更新
- `manifest.yaml` の hub.core.controllers surface に `import` を追加

**extras の扱い（運用ポリシー：固定）**

- Open 時点で発生した `extras` は **「警告/可視化のためだけに保持」**する。
- Save/SaveAs/Export の出力は **strictDoc のみ**（extras は出力に混ぜない）。
- 現時点では **extras を別ファイル（sidecar）として永続化しない**。
  - 理由：仕様が固まる前に保存形式を増やすと、I/O と UX の手戻りが大きい。
  - 代替：ユーザーが必要なら、QuickCheck の `/__import_extras` 表示から手で確認して修正する。
- 将来案（未決）：
  - A) `.extras.json` として保存
  - B) sidecar に統合（document本体には混ぜない）
  - C) 現状維持（警告のみ）

---

### 2.4 Transform（Move：planeZ 固定ドラッグ）

**実装で入っていること（根拠）**
- Move ツール（M キー/ボタン）で、単一選択の point/aux をドラッグ移動できる
  - `ui/controllers/uiTransformController.js`（gesture: begin/end group, lock/selection guard）
  - `ui/controllers/uiShortcutController.js`（M トグル）
  - `ui/controllers/uiToolbarController.js`（tool state）
- 変換の基準は「3DSS Z 固定平面（planeZ）」で、NDC→Ray→Plane 交点を world point として扱う
  - `runtime/renderer/modelerRenderer.js`（`worldPointOnPlaneZ`）
- ドラッグ中は preview 更新、pointerup で core document を更新し、Undo/Redo は 1 ステップにまとめる
  - `runtime/renderer/modelerRenderer.js`（`previewSetPosition` + line endpoint 追従）
  - `runtime/core/*`（command/history 経由）

**spec 反映方針**
- まずは Move（Translate）のみを “編集体験の芯” として先行し、Rotate/Scale は後段（Phase2→Phase3）で追加する。

## 3. Spec 先行（未実装/部分実装 → タスク化が必要）

> ここは「仕様はあるが実装が追いついていない」項目。今回の spec 改訂対象ではない（実装側を進める）。

- sidecar の永続化（UI 状態/lock 等の保存と復元）
- issue からの “focusByIssue” の UI ジャンプを、要素/パス単位で安定化（現状は基盤あり）
- frames（表示フィルタ）/animation の網羅（framesの最小表示は実装済み。アニメ/再生UIは未）
- outliner / property / preview の完全同期（Phase2 の残タスク）

---

## 4. From-now アクションプラン（優先度つき）

> 注意（次セッション開始時に必ず見るべき1行）
>
> pose ガードは現状「UI Apply 時のみ」。外部/既存 doc 由来の不正 pose を Open 時に正規化/警告するかは **将来の検討項目（範囲外）**。

### 4.1 直近（P0〜P1：破綻防止 + 仕様追従）

- [x] **spec を実装へ追従**（Preview Out / Dirty state / Export clean）  
      → 本 snapshot で反映済み
- [x] **Import 寛容化（raw → strictDoc + extras）**（Open は strictDoc だけ編集対象にする）
      - unknown fields は extras に退避し、QuickCheck に info を出す
- [ ] Preview Out の “mirror=1” を UI から有効化するかを決める  
      - A: UI で Mirror toggle（URL パラメータ付与）  
      - B: mirror はデバッグ専用（ドキュメントだけ残す）
- [ ] focus-mode（メイン preview 折りたたみ）の UX を固める  
      - 2面同時が既定で、focus-mode は任意（現状の実装を踏襲）  
      - “preview out が開いてる時だけ折りたたみ” の扱いを確定

### 4.2 近い（Phase2：編集体験の一貫性）

- [x] Transform: Move（planeZ 固定ドラッグ）を最小実装
- [x] Text: ラベル表示（point/line/aux）を最小実装（“見える化”のみ。編集UIは後段）
- [x] Frames: frameIndex（入力）+ appearance.frames による表示フィルタを最小実装
- [ ] Pick → selection → outliner → property の同期を “常時” にする（抜けを潰す）
- [ ] property “未適用編集” の挙動を統一（apply/discard/close の一貫性）
- [ ] QuickCheck issue からのフォーカス遷移（uuid/path）を確実にする

P1（入力体験・下支え）

- [x] point/aux position：Draft 入力中は `hub.previewSetPosition` でプレビューへ即時反映（Apply のみが commit）
- [x] position ステップ操作：Shift=10倍、Alt/Ctrl=0.1倍（Windows の Alt 衝突を回避するため Ctrl も許容）
- [x] position step UI：step（0.01/0.1/1/10）を UI で切替でき、wheel/arrow の基準値に反映
- [x] line endpoints：Draft 中に end_a/end_b 変更をプレビューへ即時反映（Apply のみが commit）
- [x] line caption_text：Draft 中に content/size/pose/align をプレビューへ即時反映（pose(front/up) がある場合は plane ラベルへ切替して pose/align を反映。pose 無しでも align は sprite.center に反映）
- [x] Outliner：tabs/actions を固定し、スクロールは table 領域のみ（ヘッダが消えない）
- [x] Property：pose(front/up) 入力欄を折りたたみ（details）にしてノイズを低減
- [x] Property：row を縦積み（ラベル→入力）に統一し、狭い幅でも隠れにくいレイアウトへ
- [x] Property：pose の有無で (sprite)/(plane) を薄く表示（pose=plane label に切替の説明）

#### P1 QuickCheck（Draft preview を含む）

- position: 入力中（Apply 前）にプレビューが追従する → Discard で戻る → Apply で確定 → Undo/Redo で崩れない
- line endpoints: Pick/入力で Apply 前に線が追従する → Discard で戻る → Apply で確定 → Undo/Redo
- caption_text: content/size/pose/align が Apply 前に反映される → Discard/Apply/Undo/Redo

### 2.5 Text（ラベル表示：見える化だけ先）

目的：編集対象がキャンバス上で識別できる状態にする（編集UIは後回し）。

現状（実装済み）：

- point: `appearance.marker.text.content` を優先し、無ければ `signification.name` を表示
- line: `signification.caption` を表示（`appearance.caption_text` のスタイル反映は未実装）
- aux: `signification.name` を表示（将来は `aux.module.extension` を考慮）

実装：

- renderer: `apps/modeler/ssot/runtime/renderer/modelerRenderer.js`
  - `makeTextSprite`（CanvasTexture のSprite、簡易背景/アウトライン付き）
  - `labelsGroup` を追加（pick対象外にするため modelGroup から分離）
  - line は midpoint、point/aux は位置＋Z方向オフセット
  - Transform（previewSetPosition / updateLineGeometry）でラベル位置も追従

追記（編集UI）：

- Property（point）で `appearance.marker.text` を編集可能
  - `content` / `size` / `align`
  - `content` を空にすると `marker.text` を削除し、表示は name にフォールバック

**pose(front/up) 入力ガード（UI側：固定）**

- `pose.front` / `pose.up` は、UI側で以下を保証してから Apply する。
  - ゼロベクトルは禁止（Apply をブロック）
  - `up` は `front` に直交化して正規化（Gram-Schmidt）
  - ほぼ平行（直交化後にゼロに近い）の場合は禁止（Apply をブロック）
- 成功時は **正規化済み（unit）かつ直交化済み**の値を doc に書き込む。

※注意（範囲外 / 将来検討）：この pose ガードは **UI Apply 時のみ**。Open 等で外部から入ってきた不正 pose をどう扱うか（import normalize 時に正規化/警告するか）は、将来の検討項目として残す。

### 2.6 Frames（表示フレーム：最小）

目的：`appearance.frames` に従って、現在frameでの可視/不可視を確認できる状態にする（アニメ再生UIは後段）。

現状（最小実装済み）：

- toolbar 右上に `frame` 入力（整数）を追加し、`uiState.frameIndex` として保持
- renderer 側で `appearance.visible` と `appearance.frames` を評価して可視を切り替え
  - `frames` 未指定: 常に表示
  - `frames` が整数: その frame のみ表示
  - `frames` が整数配列: 含まれる frame で表示
- UI-only visibility（hidden/solo）と frames 判定は AND で合成

実装：

- UI: `apps/modeler/ssot/index.html`（`data-role="frame-index"`）
- toolbar controller: `apps/modeler/ssot/ui/controllers/uiToolbarController.js`（frame入力 → `core.setUiState({frameIndex})`）
- hub: `apps/modeler/ssot/runtime/modelerHub.js`（`uistate` を renderer に伝搬）
- renderer: `apps/modeler/ssot/runtime/renderer/modelerRenderer.js`（`setFrameIndex` + フィルタ）

### 4.3 中期（Phase3：I/O と永続化）

- [ ] sidecar を保存・復元（lock / UI 状態 / カメラ等）
- [ ] Save/SaveAs の保存先 SSOT を整理（FSA handle の取り扱い、ラベル、復旧）
- [ ] Export の出力命名規則を固定（`.export.json` 等）

### 4.4 継続運用（毎回）

- [ ] 変更を入れたら、最低限これを CI 前に通す  
  - `node apps/modeler/ssot/scripts/check-forbidden-imports.mjs`  
  - `node apps/modeler/ssot/scripts/check-ports-conformance.mjs`  
  - `node apps/modeler/ssot/scripts/check-single-writer.mjs`  
  - `node apps/modeler/ssot/scripts/check-generated-clean.mjs`

---

## 5. 更新履歴

- 2026-01-26: 初版（repo snapshot: `3DSL_repo_20260126_221729.zip`）
- 2026-01-26: Import 寛容化（importNormalize + extras/QuickCheck）を追加
- 2026-01-27: Transform（Move：planeZ 固定ドラッグ）を最小実装（renderer: worldPointOnPlaneZ / previewSetPosition）
- 2026-01-27: Preview の既定カメラを viewer の iso-ne に合わせて修正（chirality 整合）＋ Space で再生/停止（toolbar play）
- 2026-01-27: Text（ラベル表示：point/line/aux）を最小実装（renderer: labelsGroup + makeTextSprite）
- 2026-01-27: Text（編集UI：marker.text / caption_text の編集拡張 + pose(front/up) 入力ガード）を追加
- 2026-01-27: Frames（frameIndex入力 + appearance.frames による可視フィルタ）を最小実装
- 2026-01-27: Line endpoints UI 修正（end_a/end_b が caption_text セクションに飲み込まれる DOM 崩れを修正）
- 2026-01-27: Line endpoints 設定支援（Property: end_a/end_b に Pick/Clear を追加、Preview pick を endpoint pick モードで横取り）

- 2026-01-27: Line endpoints 表示改善（end_a/end_b の uuid に対して point名 + short uuid を補助表示、datalist の候補ラベルも同形式）
- 2026-01-27: Position 入力の効率化（x/y/z: Enter=Applyして次フィールドへ進む, Shift+Enter=Apply&同フィールドに留まる, ↑↓/wheel=step, Shift/Altで粒度変更）
- 2026-01-27: Draft Preview（Apply 前プレビュー）を position / line endpoints / caption_text(content/size/pose/align) に拡張（pose(front/up)がある場合は sprite ではなく plane ラベルに切替えて pose/align を反映）
- 2026-01-27: Position step UI（見える化）：Property に step セレクタ（0.01/0.1/1/10）を追加し、↑↓/wheel の base step に適用（localStorageで保持）
- 2026-01-27: caption_text align を sprite.center にも反映（pose(front/up)が無い場合も align が効く）。Draft Preview のAPIを薄く一般化（renderer/hub に previewSetOverride(kind, uuid, payload) を追加）

## Recent changes
- P1: Draft override lifecycle centralized in uiPropertyController (capture base on open; revert on hide/selection change/discard/apply) to avoid preview state leaks.
- P1: Property layout finalized toward vertical stacking: prop rows now stack label->control (no horizontal squeeze); endpoints/caption_text/position become stable even on narrow property pane.


## 2026-01-27 (patch)
- [x] Outliner DOM row order cached and wired into selection controller for SHIFT range selection.
- [x] QuickCheck issue selection supports path-based uuid resolution when uuid is absent.
- [x] Renderer: add Z-up regression guard (console error once if camera.up deviates from (0,0,1)).
- [x] UI: document-update selection pruning discards unapplied edits if the active item was removed (prevents stale UUID/UI mismatch).
- [x] Selection guard unification: property selection revert + shortcut delete + document-prune route through uiSelectionController.setSelectionUuids (no core.setSelection bypass).

