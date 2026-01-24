================================
3DSD-modeler.md — 3DSD Modeler
================================

# 0 目的・適用範囲

## 0.1 modeler の役割

3DSD-modeler（以下、modeler）は、3DSL プロジェクトにおける **構造データ（.3dss.json）の作成・編集・検証・出力** に特化した専用アプリケーションである。

modeler は次を提供する。

- points / lines / aux の作成・編集・削除
- frame（時間層）可視性（appearance.frames）の編集と再生プレビュー
- name / caption / appearance / meta の編集
- 選択・複数選択・一括変形（Move/Rotate/Scale）
- 文字（marker.text / caption_text / aux.extension.latex）の向き（text_pose: front/up）を含む正確なプレビュー
- strict validation（スキーマ準拠）と Quick Check
- ファイル入出力（Open/Save/Save As/Export）

### 重要な前提（viewer との対称性）

- modeler は **write-enabled**（編集・保存を行う）
- viewer は **read-only**（構造データを絶対に変更しない）
- 両者は対称的な役割分担を持つ（生成＝modeler、閲覧＝viewer）

## 0.2 common / schema 仕様との関係（スキーマが契約 SSOT）

modeler は次の一次資料（契約）に従う。

- `/schemas/3DSS.schema.json`（契約 SSOT）
- `/specs/3DSD-common.md`（存在する場合：共通仕様）

modeler の **Export 3DSS** は常にスキーマ準拠であること（strict）を要求する。
一方で **Import / prep（読込）** は、上流から流入する多様な形式・不足・余剰を吸収するために、寛容（permissive）な入口を持ってよい。
ただし、寛容さは **内部 IR（中間表現）** に閉じ、**3DSS 出力に汚染（コンタミ）させない**。

- 「スキーマ不明なので推測して補間し、出力データに混入させる」ことは **禁止**
- 不足（required 欠落）を許容する場合でも、Export 時点では必ず解消し、strict validate を通すこと
- 余剰（unknown fields / comments / markers 等）を保持する場合は、3DSS ドキュメント本体に混入させず、IR または sidecar に隔離すること

## 0.3 適用範囲

本仕様は modeler 実装（例：`/apps/modeler/`）の全モジュールに適用する。

- Core：編集状態・ドキュメント状態・コマンド履歴
- Renderer：three.js 描画、選択ハイライト
- UI：テーブル（アウトライナ）・プロパティ・フレーム編集
- Validator：AJV strict validation / Quick Check
- I/O：FSA などファイル入出力
- Utils：座標変換、pose（front/up）処理

## 0.4 非対象（本仕様の範囲外）

- 右下の方位ウィジェット（いわゆる gizmo：カメラ姿勢指標の基準モデル）


- 3DSS.schema.json 自体の定義・変更
- viewer の自動起動・統合（別アプリとする）
- 外部サービスへの自動アップロード、追跡通信
- コラボ編集（同時編集・マージ） ※将来拡張
- CAD 完全互換（DWG/DXF 互換など） ※本仕様は 3DSS の編集に限定

## 0.5 設計方針（編集アプリとして）

1. **スキーマ契約の厳守（Export は strict）**  
   出力は常に `3DSS.schema.json` に strict 準拠する。

2. **編集の安全性（Undo/Redo を背骨にする）**  
   すべての編集操作はコマンド化され、Undo/Redo 可能であること。

3. **UI 状態と 3DSS データの分離**  
   3DSS ドキュメントに UI 状態（選択・カメラ・列構成・グループ等）を混入させない。  
   永続化が必要な場合は **別ファイル（sidecar）** で扱う。

4. **要素ロック（Level 1）による誤操作防止**  
   要素単位の lock を提供し、lock 要素は Transform / Delete / Property Save / LineEditor Apply の対象外とする。  
   lock は 3DSS へ混入させず、必要なら **sidecar** に保持する。

5. **忠実プレビュー（特に text_pose）**  
   `text_pose`（front/up vec3）を正しく解釈し、modeler でも viewer と同等の向きで表示する。

6. **責務分離（entry / hub / core / renderer / ui）**  
   viewer と同一のレイヤリング規則を踏襲し、依存方向を固定する。

## 0.6 アーキテクチャ：レイヤと責務：レイヤと責務

modeler は次のレイヤに分離する。

- **entry**：composition root（起動・DI のみ）
- **hub**：UI と core/renderer の仲介（ロジック最小化）
- **core**：ドキュメント編集ロジック、コマンド履歴、検証、IR
- **renderer**：three.js 描画、pick（raycast）/ 選択ハイライト（必要に応じて）
- **ui**：テーブル、プロパティ、フレーム編集、入力ハンドリング（DOM）

### 依存方向（正方向 / 禁止）

- 許可（正方向）
  - ui → entry / hub
  - entry → hub / core / renderer
  - hub → core / renderer

- 禁止（絶対）
  - core → hub / renderer / ui
  - renderer → core / hub / ui
  - hub → ui
  - ui → renderer（pick を含む）※必ず hub 経由

## 0.7 依存注入（DI）と composition root

- composition root は entry（例：`bootstrapModeler`）とする。
- core / renderer は import による密結合を避け、`createXxx({deps})` で注入する。
- hub は `{ core, renderer }` を受け取り、外部 API を束ねる。

## 0.8 ライフサイクル（start/stop/dispose）

- `hub.start()/stop()/dispose()` は idempotent。
- `stop()` は RAF 停止（編集状態は保持）。
- `dispose()` は stop + renderer 資源解放。以後 API は no-op（例外禁止）。

## 0.9 状態所有権（single-writer）

- 3DSS ドキュメント（編集対象）は core が所有する。
- UI は core の公開 API（コマンド）を通じてのみ編集する。
- single-writer：
  - ドキュメント更新は **CommandManager のみ**
  - `uiState.selection` の更新は **SelectionController のみ**
  - `uiState.camera` の更新は **CameraEngine のみ**


# 1 システム全体構造・内部アーキテクチャ（modeler）

## 1.1 モジュール構成

modeler は最小で次のモジュール群を持つ。

- entry：`bootstrapModeler()` / DI / 起動オプション解決
- hub：ModelerHub（UI⇔Core/Renderer の集約 API）
- core：DocumentCore / CommandManager / SelectionModel / IR / Validation
- renderer：SceneRenderer / PickService / GizmoService / TextBillboard/Plane（実装選択）
- ui：OutlinerTable / PropertyPanel / FramesEditor / Shortcuts
- validator：AjvStrict / QuickCheck（診断）
- io：FileSystemAccess（FSA）/ drag&drop / export
- utils：math（vec3/quat）/ pose（front/up）/ normalize（enum 等）

### 1.1.1 “共通化”の扱い

viewer/modeler で共通化する実装（shared package）が存在する場合でも、
modeler の責務として **write-enabled の編集コアは modeler 側に閉じる**。

- 共有候補：schema validation、pose math、描画プリミティブ、FSA wrapper、ログ整形
- 非共有（原則）：CommandManager、Undo/Redo、SelectionModel、編集 UI 状態機械

## 1.2 Core（editable state と編集トランザクション）

Core は **編集可能なドキュメント状態**を保持し、Command により変更を適用する。

- DocumentState：3DSS 構造（strict 出力可能な状態）
- AuthoringState：IR / 未確定・余剰の隔離（strict 出力対象外）
- CommandManager：apply/undo/redo、履歴、トランザクション境界
- SelectionModel：選択集合、ハイライト、ロック等（UI状態。3DSSへは混入しない）

## 1.3 依存関係（core 主導）

- hub は core/renderer を呼び出すが、状態の SSOT は core に置く。
- renderer は **参照専用の Snapshot** を受け取り描画する（renderer が core を更新しない）。
- ui は hub の公開 API のみ呼ぶ（core/renderer を直接触らない）。

## 1.4 各モジュールの責務

### 1.4.1 entry（bootstrapModeler）

- 起動引数・URL パラメータ・dev harness 由来の設定解決
- DI 構築（createCore/createRenderer/createHub）
- start/stop/dispose のライフサイクル管理

### 1.4.2 hub（ModelerHub）

- UI から見た唯一の API
- コマンドの発行（create/move/rotate/edit props 等）
- pick 結果の解決（renderer → hub → core で selection 更新）
- renderer への “描画更新要求” と frame 再生制御

### 1.4.3 core（DocumentCore）

- Import（寛容）→ IR 生成 → strict 出力可能な DocumentState への収束（Export 時）
- strict validate（AJV）および Quick Check の発行
- コマンドの整合性（例：UUID 一意性、参照整合、frames 値域）

### 1.4.4 renderer（SceneRenderer）

- three.js シーン構築、描画
- pick（raycast）・ヒットテスト・ハイライト
- text_pose の解釈（front/up）に基づく文字向き表示（marker.text / caption_text / latex）

### 1.4.5 ui（Outliner / Property / Frames）

- OutlinerTable：要素の俯瞰・検索・ソート・最小限の列編集
- PropertyPanel：要素の詳細編集（appearance/meta/label/pose）
- FramesEditor：frames 一覧・再生プレビュー制御・範囲編集 UI（※保存は strict 型に変換）
- Shortcuts：キー入力（ただし実処理は hub へ）

### 1.4.6 validator

- AjvStrict：3DSS.schema.json による strict validate（Export/Save で必須）
- QuickCheck：Import/編集中の診断（warning 中心、strict failure でも継続可）

### 1.4.7 io

- Open/Save/Save As：FSA を第一選択（fallback は download/upload）
- Export：strict 3DSS の生成と出力（sidecar 併用可）

## 1.5 I/O（modeler 概要）

- Open：`.3dss.json`（strict）/ `.3dss-prep.json`（寛容）を入力として受ける
- Save/Save As：**strict 3DSS** を保存する（未確定/余剰は sidecar へ）
- Export：共有用の strict 3DSS を生成（必要に応じて flatten/normalize を実施）
- Import 時の余剰保持：
  - 既知外キーやコメント等は IR に隔離し、3DSS 本体へは出力しない
  - 破棄する場合は QuickCheck warning を出す

## 1.6 禁止事項（modeler 全体）

- 3DSS 出力に unknown fields を混入させる補間（コンタミ）
- renderer が core を直接更新する設計（single-writer 破り）
- UI 状態（選択・カメラ・列・グループ等）を 3DSS に保存する
- 外部送信（追跡・ログ送信・アップロード）をデフォルト有効にする

## 1.7 起動フロー

dev harness / 本番埋め込みの差はあっても、起動の SSOT は `bootstrapModeler` とする。

- harness → bootstrapModeler → createCore/createRenderer → createHub → hub.start()
- Open（初期ファイルがある場合）：hub.openFile(...) → core.import(...) → renderer.update(snapshot)

## 1.8 dev modeler と本番 modeler

- dev modeler：ローカル/開発用（ログ・診断 UI を含むことがある）
- 本番 modeler：公開 UI（診断は必要最小の表示）

両者は **同一の entry/core/renderer/hub** を共有し、差分は UI 層に閉じる。

## 1.9 baseline 起動時の固定条件

- coordinate_system：Z+up/freeXY を前提（ドキュメントの値が違う場合は QuickCheck warning）
- units：non_si:px を推奨（異なる場合は表示上の単位表記に反映するが、座標値は変換しない）


# 2 データ構造とスキーマ準拠（編集側視点）

## 2.1 modeler が扱う入力形式

modeler は次を入力として扱う。

- `.3dss.json`：3DSS 構造層（strict）
- `.3dss-prep.json`：Authoring 層の受け渡し（permissive）※推奨インターフェース

### 2.1.1 Import（permissive）の規則

- required 欠落や unknown fields を検出しても、**可能な限り読込を継続**してよい
- ただし、読込継続は **IR への隔離**により実現し、3DSS 本体へ自動混入させない
- 参照不整合（例：line.endpoint.ref が存在しない）は、QuickCheck warning とし、UI で修正可能にする

## 2.2 Save / Export（strict）の規則

- Save / Save As / Export は **常に strict 3DSS** を出力する（AJV strict validate を通す）
- strict を満たせない場合：
  - Save/Export は失敗とし、原因（missing required 等）を表示する
  - ただし編集中の状態（IR）は破棄しない

### 2.2.1 sidecar（UI 状態・余剰保持）

- UI 状態（選択・カメラ・列セット・グループ等）や、Import 由来の余剰情報を保持したい場合、
  `*.3dss.sidecar.json` を用いる（3DSS 本体へは混入しない）。
- sidecar は strict 契約外であり、互換性は modeler に閉じる。

### 2.2.1.1 lock（要素ロック）の保持

- lock は **要素単位**で管理する（point/line/aux）。
- lock 情報は 3DSS 本体に保存しない。保持が必要な場合は sidecar に保存する。
- sidecar での表現は実装都合でよいが、最低限次を満たすこと：
  - 対象は uuid で参照する（name/caption では参照しない）
  - lock の有効/無効が復元できる



## 2.2.2 Auto Repair Policy（自動補完ポリシー：Import/permissive 内）

本節は、Import（permissive）時に「欠落 / 不正」を検出した場合の **自動補完・正規化の許可範囲**を定める。  
ここでの自動処理は **IR（中間表現）に閉じる**ことを原則とし、3DSS 出力（Save/Export）では strict validate を必ず通す。

### 2.2.2.1 分類（A/B/C）

- **A: 安全なデフォルト（確定的）**  
  スキーマの default / 明確に一意な規則により、推測を伴わず確定できる補完・正規化。

- **B: 機械的に導出できる値（決定的）**  
  他フィールドや入力形式から **計算で一意**に導出できる補完・変換（例：UUID生成、範囲展開）。

- **C: 意味が絡む推測補完（禁止）**  
  “たぶんこうだろう” の推測を含む補完。3DSS 本体への混入（コンタミ）を引き起こすため禁止。

### 2.2.2.2 ルール（共通）

- A/B の処理を行った場合、QuickCheck に **warning** を出し、どの要素・どのフィールドに適用したかを示す。
- C に該当する問題は自動修復せず、ユーザー修正を要求する。未解決が残る場合、Save/Export は失敗とする。
- A/B は Import 時に IR へ反映してよいが、**Save/Export 時点で strict へ収束**できない場合は保存しない。

### 2.2.2.3 対象別ポリシー（A/B/C）

| 対象 | 欠落（Missing） | 不正（Invalid） | 分類 | 処理（IR内） | Save/Export時の扱い |
|---|---|---|---|---|---|
| document_meta | `document_meta` 欠落 / required 欠落 | 型不一致・必須欠落 | A/B | **B**: 生成可能なものは生成（例：`document_uuid`）／**A**: スキーマ既定値がある項目は適用 | required が未解決なら **ブロック**（strict failure） |
| uuid（meta.uuid） | 要素 uuid 欠落 | 重複 / 形式不正 | B | **B**: 新規 UUIDv4 を生成（欠落のみ）。重複は自動解消せず（下段参照） | 欠落・重複が残る場合 **ブロック** |
| frames（appearance.frames） | 未設定 | 型不一致 / 範囲表記 / 重複 | A/B | **B**: 範囲表記（例：`1-10`）を IR で展開し、**A**: sort+unique で正規化 | Export は int / int[] の strict 型へ変換、未解決なら **ブロック** |
| pose（text_pose: front/up） | `pose` 欠落（required） | vec3でない / frontとupが平行に近い | A/C | **A**: スキーマ既定（ある場合）を適用。平行に近い場合は“描画用に直交化”は可（値は保存しない） | required 欠落は **ブロック**。平行は保存値の自動修正は禁止（warning） |
| align（marker.text.align 等） | 未設定 | 旧表記・非正規表記 | A | **A**: 正規表記へ正規化（例：旧入力を `left&top` 等へ） | 保存値は常に正規表記。解釈不能なら **ブロック** |
| ref整合（endpoint.ref 等） | 参照先が無い | 循環・不整合 | C | **禁止**：参照を推測して付け替えない。IRに“未解決”として保持し、UIで修正させる | 未解決が残る場合 **ブロック** |

#### 補足：uuid 重複の扱い

uuid 重複は “意味が絡む推測” を含み得るため、原則 **自動解消しない（C寄り）**。  
ただし、**欠落と同様に「新規生成しても他との意味衝突が起こらない」とユーザーが明示操作した場合**（例：UIの「Re-generate UUID」ボタン）に限り、B として扱ってよい。

## 2.2.3 Save/Export のブロック条件（strict failures：出口）

本節は、Save / Save As / Export（strict 3DSS 出力）で **処理を停止（ブロック）**すべき条件を定める。  
これらは「自動補完で救う」対象ではなく、ユーザー修正により strict validate を満たすことを要求する。

### 2.2.3.1 ブロック条件（代表例）

- AJV strict validate に失敗（required 欠落 / 型不一致 / additionalProperties 違反 等）
- `document_meta` の required が未解決（Export 時点で strict に収束していない）
- `meta.uuid` の欠落または重複が未解決（要素識別が確定していない）
- ref 整合が未解決（存在しない uuid 参照、endpoint.ref が解決不能 等）
- `frames` が strict 型（integer / integer[]）に変換不能（IR が未解決）
- `text_pose` の required 欠落（例：`marker.text.pose` など required のまま未解決）
- `align` が解釈不能（正規表記へ正規化できない）

### 2.2.3.2 ブロック時の挙動

- Save/Export を失敗として終了し、**原因一覧**（対象uuid + フィールドpath + expected/actual + message）を提示する。
- IR（未確定状態）は破棄しない。
- 可能なら該当要素へジャンプ（Outliner/Property）できる導線を提供する。

#### UI 導線（Export 失敗時）

Save / Export を実行した結果 `error` が残っている場合、modeler は **Export を中断**し、次の導線で修正に誘導する。

1. **Save/Export ダイアログ（または QuickCheck パネル）**を開き、`error` 一覧を表示する  
   - 既定は `error` のみ表示（必要なら `warn` を展開）
   - 並び順は `kind → uuid → path` で安定させる（再現性のため）

2. 一覧の **1行 = 1 Issue** とし、行クリックで **フォーカス遷移**する  
   - `uuid != null`：Outliner で該当行を選択し、PropertyPanel を開く
   - `uuid == null`（document問題）：DocumentMeta/Frames 等の該当パネルへ遷移する

3. PropertyPanel では `path` に対応するフィールドまで **スクロール＋ハイライト**する  
   - UI が `path` を直接対応できない場合でも、最低限「該当セクション」へ移動し、`path` を表示する

4. `ref` 不整合など “修正先が複数候補” の場合は、Issue に `hint` を付与し、修正の手順を提示する（6.2 参照）

5. ユーザーが修正を行ったら QuickCheck を再実行し、`error=0` になるまで Save/Export を許可しない

#### フォーカス遷移 API（仕様）

UI は次の最小 API を持つ（内部実装は問わない）。

- `focusByIssue(issue)`：Issue を受け取り、Outliner/Property を同期し、該当フィールドへ誘導する
- `selectByUuid(uuid)`：Outliner 選択を uuid で行う（配列indexでは行わない）
- `openProperty(uuid | "document")`：PropertyPanel を開く
- `revealPath(path)`：PropertyPanel 内で該当フィールドへスクロールする



## 2.2.4 Import の致命条件（fatal：入口）

Import（permissive）は「読めるところまで読む」を原則とし、停止は **例外的**とする。  
停止（fatal）とするのは、IR 構築や編集継続が技術的に不可能な場合に限る。

### 2.2.4.1 fatal 条件（最小）

- JSON 解析に失敗（構文エラー等でパース不能）
- ルートが object でなく、IR の構築が不可能（例：配列/文字列のみ）
- 実装上の制限により処理不能（例：極端に巨大でメモリ・時間制約を超過）

### 2.2.4.2 fatal でない（warnで継続する）例

- `schema_uri` が想定外／不明（互換レイヤが無い場合でも、可能な範囲で読込みを継続し warning を出す）
- unknown fields / 旧表記 / required 欠落（IR に隔離し、編集で解消を促す）


## 2.2.5 痕跡保持ポリシー（IR / sidecar / ログ）

本節は、Import（permissive）や編集中に発生する “痕跡”（欠落・余剰・自動正規化・未解決事項等）を **どこに保持するか**を最小ルールとして固定する。  
最終成果物である strict 3DSS（`.3dss.json`）へ痕跡を混入（コンタミ）させないこと。

### 2.2.5.1 役割分担（要点）

| 置き場 | 目的 | 永続 | 代表例 | strict 3DSS への混入 |
|---|---|---:|---|---|
| **IR（中間表現）** | permissive Import と編集中の未確定状態を保持（作業中だけ） | いいえ | unknown fields、範囲表記、未解決 ref、下書き入力 | **禁止** |
| **sidecar**（`*.3dss.sidecar.json`） | “次回再開”のための状態を保持（作業支援） | はい（任意） | lock、列セット、UIレイアウト、カメラ、Import 由来の余剰保持、QuickCheckスナップショット | **禁止** |
| **ログ**（runtime） | 診断・デバッグ（その場で見る） | 既定はいいえ | BOOT/DOC/EDIT/VALIDATE/IO、QuickCheck一覧、auto-repair適用記録 | **禁止** |

### 2.2.5.2 固定ルール（最小）

- **Save/Export（strict）**は `.3dss.json` のみを対象とし、IR/sidecar/ログ由来の情報を混入しない。
- IR は “寛容さ” の受け皿であり、**未解決を未解決のまま保持**してよい（ただし 2.2.3 の条件で出口は止まる）。
- sidecar は UI 状態および作業再開に必要な痕跡のみを保持し、要素参照は **必ず uuid** を用いる（配列indexやnameで参照しない）。
- sidecar は対象ドキュメントに **バインド**されること（例：`document_meta.document_uuid` を保持し、異なるドキュメントへ誤適用しない）。
- ログは既定で永続化しない。保存する場合は “診断レポート” として明示的に export し、strict 3DSS とは別物として扱う。

### 2.2.5.3 sidecar の最小スケルトン（例）

```json
{
  "sidecar_version": "0.1.0",
  "doc": { "document_uuid": "..." },
  "ui": {
    "outliner": { "columns": ["lock","name","pos","frames","uuid8"] },
    "layout": { "mode": "single-window" }
  },
  "authoring": {
    "locked_uuids": ["..."],
    "unknown_fields_by_uuid": { "...": { "raw": {} } }
  },
  "diagnostics": {
    "quickcheck": { "last_run_at": "2026-01-24T00:00:00Z", "issues": [] }
  }
}
```


## 2.3 ドキュメントメタ（document_meta）

- modeler は `document_meta` の required を満たす編集 UI を提供する。
- 生成時のデフォルト：
  - `document_uuid` は UUIDv4 を自動生成する
  - `schema_uri` は既定の release URI（アンカー付き）を自動設定する
  - `version` は `1.0.0` を初期値とする（以後の運用は別規定）

## 2.4 要素の識別（uuid / name）

- 永続識別子は `meta.uuid` である（参照の SSOT）。
- UI のインデックス表示は `name/caption` を優先してよいが、uuid を常に参照可能であること。
- Outliner では UUID を短縮表示してよい（例：先頭 8 桁）。コピー操作でフル UUID を取得できること。

## 2.5 points（存在要素）

### 2.5.1 必須・推奨フィールド

- `meta.uuid`：必須
- `appearance.position`：位置（デフォルトあり）
- `appearance.marker.primitive`：必須
- `appearance.marker.text` を持つ場合：
  - `content` と `pose` が必須（pose は front/up vec3）

### 2.5.2 Outliner（points）の最小列

points の Outliner は「俯瞰」に徹し、列は次を最小とする。

- name（表示名）
- position（x,y,z）
- text（size / pose / align）※必要な範囲のみ（列セット切替を推奨）
- uuid（短縮）

詳細（marker、色、opacity、tags 等）は PropertyPanel で扱う。

## 2.6 lines（関係要素）

### 2.6.1 endpoints（end_a / end_b）

- endpoint は **ref / coord のいずれか**であり、両方同時には持たない。
- modeler は次を提供する。
  - ref 型：既存 point の uuid を参照（推奨）
  - coord 型：座標直書き（補助線等に利用）

### 2.6.2 caption と caption_text

- 表示文字列は `signification.caption`（localized_string）である。
- 表示スタイルは `appearance.caption_text`（font_size / pose）である。
- `caption_text.pose` は text_pose（front/up vec3）であり、modeler は正確に表示する。

### 2.6.3 Outliner（lines）の最小列

- caption（表示名）
- end_a / end_b（ref は短縮 uuid、coord は座標）
- frames
- uuid（短縮）

## 2.7 aux（補助要素）

- aux は grid/axis/plate/shell/hud/extension を含む。
- extension.latex を用いる場合、`pose` は必須である（front/up vec3）。

### 2.7.1 Outliner（aux）の最小列

- type（grid/axis/plate/shell/hud/extension）
- name（表示名：存在しない場合は type を表示名に用いる）
- position
- frames
- uuid（短縮）

## 2.8 frames（時間層）編集

### 2.8.1 frames の型

frames は次のいずれかである。

- integer（単一フレーム）
- integer[]（複数フレーム、重複無し）

### 2.8.2 UI 入力（範囲・式）と strict 型

- FramesEditor は、入力利便のため `1-10` 等の範囲表記を受けてもよい。
- ただし、範囲表記は IR 内で解決し、Save/Export では strict 型（integer または integer[]）へ変換する。

### 2.8.3 正規化（推奨）

Save/Export 時に frames を正規化する場合、次を推奨する。

- 複数値：昇順ソート + unique
- 単一値：integer として出力
- 未設定：frames プロパティ自体を省略（常時表示扱い）

## 2.9 text_pose（front/up）の解釈（modeler 側）

### 2.9.1 対象

modeler は次の pose を、viewer と同等に解釈して描画する。

- point.marker.text.pose
- line.appearance.caption_text.pose
- aux.module.extension.latex.pose

### 2.9.2 数学的要件（直交化）

- `front` と `up` は正規化し、直交化して描画に用いる。
- `front` と `up` が平行に近い場合は、診断を出し、描画は安全なフォールバックで継続してよい（ただし値は自動修正して保存しない）。


# 3 UI構成と操作体系（modeler）

> NOTE: 本章以降は “アウトライナ最小列 + プロパティ詳細編集 + frames 表” を基本に記述する。
> 実装が固まるまで、章立てだけ先に固定し、内容は段階的に充填する。

## 3.1 画面レイアウト（PC前提）

modeler は **PC（キーボード＋マウス）前提**とし、スマホUIは対象外とする。

### 3.1.1 既定レイアウト（単一ウィンドウ：P0）

既定は **単一ウィンドウ内の分割表示**とする。

- 左：Outliner（スプシ）
- 中：Preview（WebGL）
- 右：PropertyPanel（＋FramesEditor はタブ/下段等）

### 3.1.2 プレビューの分離（Detach Preview：P1 任意）

マルチモニタ作業支援として、Preview を **別ウィンドウに分離**できてもよい（任意機能）。

- 「Detach Preview」で新規ウィンドウを開き、Preview（WebGL）を表示する
- Core（ドキュメント状態）は単一（single-writer）を維持し、複数ウィンドウ間は hub を介して同期する
- 分離時も Outliner/Property はメインウィンドウに残す（編集SSOTの散逸を防ぐ）

※実装上、WebGL キャンバスの“移動”ではなく、分離先で renderer を再生成し、core の snapshot を購読して描画する方式を推奨する。

**スコープ決定**：P0 は 3.1.1 の単一ウィンドウ（3ペイン）を必須とし、Detach Preview は P1（任意機能）として後続フェーズで検討する。

## 3.2 Outliner（points / lines / aux / frames）
## 3.3 PropertyPanel（共通/種別別）
## 3.4 選択（単体/複数/範囲）とフィルタ
## 3.5 変形（Move/Rotate/Scale）と数値入力
## 3.6 スナップ（OSNAP / グリッド / 軸ロック）
## 3.7 Undo/Redo とコマンド履歴 UI
## 3.8 ショートカット（キーマップ）

## 3.9 lock（要素ロック）と誤操作防止

### 3.9.1 目的

- GUI 誤操作による意図しない移動・編集を防止する。
- “編集対象から外す” ことにより、作業中のモデル基準（固定部分）を守る。

### 3.9.2 lock の粒度（Level 1）

- lock は **要素単位**（point/line/aux）。
- 部分ロック（position だけ等）は行わない（Level 2 は非採用）。

### 3.9.3 lock の効果（禁止操作）

lock 要素に対して、modeler は次の操作を拒否する。

- Transform（Move / Rotate / Scale）
- Delete
- PropertyPanel の Save（閲覧は可）
- Line エディタ（Advanced）の Apply

拒否時は QuickCheck/Toast 等で理由を提示する（例：「locked: uuid=...」）。

### 3.9.4 lock のUI導線

- Outliner：
  - **左端列**に lock トグル（🔒）を置く（最短導線）
  - lock=ON の行は **行全体をグレーアウト**して状態を明確化する
- Preview：
  - lock 要素も pick は可能（参照・選択・フォーカスのため）
  - ただし Transform（Move/Rotate/Scale）開始時に lock 判定を行い、lock 要素は除外または操作拒否する
- PropertyPanel：
  - lock の切替（ReadOnly 表示でもよい）
  - lock 中は Save ボタンを無効化する

### 3.9.5 永続化

- lock 状態は UI 状態として扱い、必要に応じて sidecar に保存する（3DSS へ混入させない）。



## 3.10 QuickCheck パネル（保存失敗時の導線）

- QuickCheck パネルは常設（ドック）または Save/Export ダイアログ内に表示される。
- 既定は `error` を強調し、`warn` は折りたたみでよい。
- 一覧→クリック（または Enter）で Outliner/Property へフォーカスする（2.2.3.2 / 6.2 参照）。
- “修正→再チェック” のループが途切れないことを重視する（閉じても作業は継続、再表示可能）。


## 3.11 Transform（P0：Move/Rotate/Scale）とモード遷移

本節は modeler の最小編集機能として、複数選択を含む Transform 操作（Move/Rotate/Scale）を定義する。

### 3.11.1 前提（複数選択）

- 選択は Preview（ピック）および Outliner（複数行選択）から行える。
- 選択は **複数要素**（point/line/aux）を許容する。
- lock 要素は選択可能だが、Transform 対象からは除外または操作拒否する（3.9 参照）。

### 3.11.2 モード（P0）

- `Select`（通常）
- `Move`
- `Rotate`
- `Scale`

### 3.11.3 キーマップ（P0 固定）

- `M`：Move モードへ
- `R`：Rotate モードへ
- `S`：Scale モードへ
- `Enter`：確定（commit）
- `Esc`：キャンセル（Select に戻る、変更は反映しない）
- `X / Y / Z`：軸ロック切替（押下で該当軸に拘束、再押下で解除）

※ `M/R/S` はトグルではなく「該当モードへ遷移」とする。

### 3.11.4 操作（Preview）

- Transform は **モード中のみ**ドラッグ操作で発動する（Select モードでのドラッグは移動しない）。
- 作業平面（work plane）は P0 では次のいずれかに固定し、実装都合でよい：
  - `camera-plane`（カメラ平面）
  - `world-XY`（ワールドXY平面）
- 軸ロック（X/Y/Z）が有効な場合、ドラッグは該当軸方向に拘束される。

### 3.11.5 コミット粒度（Undo/Redo のための固定）

- Transform は **1回の確定（Enter）= 1コマンド**として CommandManager に記録する。
- ドラッグ中はプレビュー更新を行ってよいが、**確定まではドキュメント状態を確定させない**（トランザクション扱い）。
- `Esc` はドラッグ中/終了後を問わず、未確定の変更を破棄する。

### 3.11.6 数値入力（P1 以降）

P0 ではドラッグによる操作を主とし、数値入力（Δx/Δy/Δz 等）は P1 以降の拡張として扱う。


# 4 三次元描画とカメラ（modeler）

## 4.1 シーン構成（grid/axis/selection/gizmo）
## 4.2 ピッキング（raycast）と優先順位

- lock 要素は pick 可能とする（参照・フォーカス・プロパティ閲覧のため）。
- ただし pick から直接 Transform へ遷移する場合は lock 判定を行う（3.9 参照）。

## 4.3 変形操作（Move/Rotate/Scale）と作業平面
- modeler は viewer の右下方位ウィジェット等の “鑑賞UI” を持たない（0.4 参照）。
- Transform のための常設オンスクリーン gizmo（ハンドル）は P0 では必須としない。モード中のドラッグ＋軸ロックで成立させる。
- 作業平面（work plane）と軸ロックの解釈は 3.11 と一致させる。

## 4.4 テキスト描画（pose / align / size）
## 4.5 カメラ（orbit / fit / reset）
## 4.6 フレーム再生プレビュー（frames の適用）


# 5 UIイベントと状態管理（modeler）

## 5.1 状態機械（mode）
## 5.2 入力イベント（mouse/touch/keyboard）
## 5.3 single-writer とコマンド境界
- CommandManager は apply 前に対象要素の lock を検査し、禁止操作をブロックする。
- 変形中（ドラッグ中）はプレビュー更新を行ってよいが、コミット時に lock を再検査する。
- Transform（Move/Rotate/Scale）は “トランザクション” として扱い、`commit()`（Enter）で 1コマンドとして確定する。
- ドラッグ中に生成される中間状態は IR/UI 状態に留め、commit 前に strict 3DSS へ反映しない。
- `cancel()`（Esc）時は中間状態を破棄し、ドキュメント状態を変更しない。

## 5.4 バリデーション（編集時の即時診断）
## 5.5 パフォーマンス（大規模データ時）


# 6 ログ・診断・外部連携と禁止機能（modeler）

## 6.1 ログカテゴリ（BOOT/DOC/EDIT/VALIDATE/IO）
## 6.2 Quick Check の出力と UI 表示
QuickCheck は Import（permissive）および編集中に発生する問題を **診断（diagnostic）**として収集し、UI とログへ提示する。  
QuickCheck 自体は 3DSS の契約ではなく、**編集支援のための診断レイヤ**である。

### 6.2.1 severity（重大度）

- `error`：未解決のまま Save/Export（strict）へ進むことを許さない（ブロック対象）
- `warn`：継続可能。ユーザー注意（自動正規化・旧表記・推奨違反等を含む）
- `info`：参考情報（任意）

※ `error`/`warn` の境界は 2.2.3（出口ブロック条件）と整合すること。

### 6.2.2 出力フォーマット（payload）

QuickCheck の 1件（Issue）は次の payload を持つ。  
**必須フィールド**を固定し、UI はこの payload から「原因一覧」「ジャンプ導線」を構成する。

#### 必須

- `severity`：`"error" | "warn" | "info"`
- `code`：機械可読な識別子（例：`REF_MISSING_TARGET` / `UUID_DUPLICATE`）
- `uuid`：対象要素の `meta.uuid`。ドキュメント全体の問題は `null` を許容する
- `kind`：`"document" | "point" | "line" | "aux" | "unknown"`
- `path`：対象オブジェクト内の JSON Pointer（要素ルートからの相対）。例：`"/appearance/marker/text/pose"`
- `expected`：期待する条件（文字列または小さな JSON 値）
- `actual`：実際の値（文字列または小さな JSON 値）
- `message`：人間向け説明（1行）

#### 任意（推奨）

- `hint`：修正の指針（UI が「修正案」として表示できる短文）
- `source`：`"import" | "normalize" | "edit" | "validate"`
- `can_autofix`：`boolean`（true の場合でも “自動で実行する” とは限らない）
- `autofix_applied`：`boolean`（A/B の自動補完・正規化を実施した場合 true）
- `related_uuids`：参照不整合等で関係する uuid 群（例：参照先候補）
- `ts`：ISO 8601（任意、ログ用途）

#### path のルール

- `path` は **要素ルートからの相対 JSON Pointer**とする（配列 index に依存しないため）。
- UI は `uuid` で要素を特定し、`path` で該当フィールドへフォーカスする。
- `uuid=null` の場合（document問題）は `kind="document"` とし、`path` はドキュメントルート相対とする（例：`"/document_meta"`）。

### 6.2.3 表示（UI）要件

- QuickCheck パネル（または Save/Export ダイアログ内）に **一覧**を表示する（severity でフィルタ可能）。
- 1行クリックで `focusByIssue(issue)` を呼び、該当要素へジャンプする（Outliner で選択＋PropertyPanel を開く＋`path` へスクロール）。
- `error` が 1件でも残る場合、Save/Export はブロックし、ブロック理由として QuickCheck を提示する。
- 一覧の操作性（任意だが推奨）：
  - `↑/↓`：行移動
  - `Enter`：フォーカス遷移（クリック同等）
  - `Esc`：一覧を閉じる（修正作業は継続）



### 6.2.4 例（JSON）

```json
{
  "severity": "error",
  "code": "REF_MISSING_TARGET",
  "uuid": "c0a8012e-2e1c-4c1f-9f24-1c1d9f86a111",
  "kind": "line",
  "path": "/end_a/ref",
  "expected": "ref points to existing point uuid",
  "actual": "8c2a... (missing)",
  "message": "end_a.ref points to a missing point uuid",
  "hint": "Pick an existing point for end_a, or switch endpoint to coord",
  "source": "import",
  "can_autofix": false,
  "autofix_applied": false
}
```


## 6.3 エラーハンドリング（例外禁止と no-op）
## 6.4 外部連携（禁止：追跡/自動アップロード）


# 7 拡張・互換性（modeler）

## 7.1 schema_uri とバージョン追従
## 7.2 sidecar の互換性方針（modeler 内限定）
## 7.3 将来拡張（constraints / blocks / collaboration）
