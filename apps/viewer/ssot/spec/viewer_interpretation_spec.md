# Viewer Interpretation Spec (implementation-derived)

## Overview
viewer 実装が **実際に解釈しているフィールド** を、runtime のコードから抽出したメモです。  
理想や設計意図ではなく、現在の実装に準拠した「現状の事実」を固定する目的で記載しています。

## Data flow (relevant path)
1. `runtime/bootstrapViewer.js` で document を読み込み・検証・freeze・index を作成  
2. `runtime/core/structIndex.js` が appearance/frames/lineProfile などを正規化  
3. `runtime/core/computeVisibleSet.js` が frame/visible 判定  
4. `runtime/renderer/context.js` が points/lines/labels を実際に描画  
5. `runtime/renderer/labels/*` が marker.text を正規化してラベル化

## Field interpretation (implementation facts)
> **凡例**:  
> - **既定値** = 未指定/欠落/無効の場合の扱い  
> - **無効値の扱い** = ignore/normalize/fallback/skip など  
> - **参照元** = 実装ファイル/関数

| フィールドパス | 型/許容値 | 既定値・欠落時 | 無効値の扱い | 参照元 | 備考 |
|---|---|---|---|---|---|
| `document_meta.i18n` | `string` | `"ja"` | 非文字列 → `"ja"` | `runtime/renderer/labels/labelIndex.js` `buildPointLabelIndex` | ※object 形（`{default_language,...}`）は **strictValidate=false の正準化**で string 化された後にここへ来る |
| `signification.name` | `string` or `{[lang]:string}` | `null`（空ならラベル無し） | 空文字/空白 → `null` | `runtime/renderer/labels/labelIndex.js` `normalizePointName` | `marker.text.content` が無い場合の fallback |
| `appearance.marker.text.content` | `string` | `signification.name` にフォールバック | 空/空白 → `null`（ラベル無し） | `runtime/renderer/labels/labelIndex.js` `buildPointLabelFromPoint` | `marker.text` が無い場合は `signification.name` へ |
| `appearance.marker.text.size` | `number`（`>0`） | `LABEL_TEXT_DEFAULTS.size` | `<=0` or NaN → default | `runtime/renderer/labels/labelSpec.js` `normalizeTextSize` | default は `labelSpec.js` |
+| `appearance.marker.text.align` | `"left&top"` / `"left top"` など（`left/center/right` × `top/middle/baseline`） | `LABEL_TEXT_DEFAULTS.align` | 不正値 → default | `runtime/renderer/labels/labelSpec.js` `normalizeTextAlign` | `"left"` のような単独指定は `middle` 補完（区切りは `&` でも空白でも可） |
+| `appearance.marker.text.pose` | `{mode:"fixed",front,up}` / `{mode:"billboard",up?,roll?}` / legacy: `"xy"|"yz"|"zx"|"billboard"` | `LABEL_TEXT_DEFAULTS.pose` | 不正値 → default | `runtime/renderer/labels/labelSpec.js` `normalizeTextPose` | `billboard` は Sprite 化（※現状 `up` は未使用、`roll` だけ反映）。`fixed` は mesh 回転＋裏面からの鏡文字防止で 180° flip |
| `appearance.marker.text.font` | `string` or `{family, style, weight}` | `LABEL_FONT_DEFAULT_FAMILY` | 不正 `style/weight` → `"normal"` | `runtime/renderer/labels/labelSpec.js` `normalizeTextFont` | `LABEL_TEXT_DEFAULTS.fontToken` はデフォルト扱い |
| `appearance.position` | `[x,y,z]` 数値配列 | `[0,0,0]` | 不正なら 0 埋め/読み取り失敗はスキップ（renderer側） | `runtime/core/structIndex.js` `sanitizeVec3`（index化） / `runtime/renderer/context.js` `readVec3` + `renderer/adapters/compat.js` `readPointPos` | renderer は **index優先**ではなく、まず pts 収集→ `readPointPosCompat(p, readVec3)` で確定し `pointPosByUuid` を作る |
| `appearance.color` | `string` or `number` | `0xffffff` | parse 失敗 → fallback | `runtime/renderer/context.js` `readColor(v, fallback)` | `appearance.color` 優先、無ければ `color` 直下も拾う |
| `appearance.opacity` | `number` | `1` | NaN → default、`<0`/`>1` → clamp(0..1) | `runtime/renderer/context.js` `readOpacity(v, fallback)` | `appearance.opacity` 優先、無ければ `opacity` 直下も拾う |
| `appearance.visible` | `boolean` | `true` | `false` のみ非表示 | `runtime/core/computeVisibleSet.js` `isVisibleFlag` | `visible:false` が唯一の非表示指定 |
| `appearance.frames` | `number` or `number[]` | 指定無しなら全フレーム可視 | 無効値は無視（全無効なら指定無し扱い） | `runtime/core/computeVisibleSet.js` `isVisibleOnFrame` / `runtime/core/structIndex.js` `normalizeFrames` | `structIndex` は整数 `[-9999, 9999]` のみ採用 |
| `appearance.frame` | `number` | 指定無しなら無視 | 無効値 → 無視 | `runtime/core/computeVisibleSet.js` `isVisibleOnFrame` | `frames` より後段で判定 |
| `appearance.frame_range` / `frameRange` | `{min,max}` or `{start,end}` | 指定無しなら無視 | 無効値 → 無視 | `runtime/core/computeVisibleSet.js` `isVisibleOnFrame` | min/max が片方でも有限なら判定 |
| `appearance.frame_start` / `frame_end` | `number` | 指定無しなら無視 | 無効値 → 無視 | `runtime/core/computeVisibleSet.js` `isVisibleOnFrame` | `frame_range` より後段 |
| `appearance.end_a` / `appearance.end_b` | `string|object|array` | 未指定 → line を描画しない | 解決不能 → line skip | `runtime/core/structIndex.js` `buildUUIDIndex` / `runtime/renderer/context.js` `resolveEndpoint` | `renderer/adapters/compat.js` が `endpoints` などの互換キーを吸収 |
| `appearance.endpoints` | `[a,b]` or `{a,b,from,to,...}` | `end_a/end_b` が優先 | 形揺れは compat 側で吸収 | `runtime/renderer/adapters/compat.js` `pickLineEndpoint` | compat のみ。core は `end_a/end_b` を保持 |
| `signification.sense` | `"a_to_b"|"b_to_a"|"bidirectional"|"neutral"` | `"a_to_b"` | 不正値 → default | `runtime/core/structIndex.js` `normalizeSense` | line effect の向き補助に使う |
| `signification.relation.*` | `{structural|dynamic|logical|temporal|meta: string}` | `{family:null, kind:null}` | 不正値 → null | `runtime/core/structIndex.js` `extractRelationInfo` | `effect_type` の暗黙 default 推定に使用 |
| `appearance.line_type` | `"straight"|"polyline"|"catmullrom"|"bezier"|"arc"` | `"straight"` | 不正値 → default | `runtime/core/structIndex.js` `normalizeLineType` | `lineProfile.lineType` に格納 |
| `appearance.line_style` | `"solid"|"dashed"|"dotted"|"double"|"none"` | `"solid"` | 不正値 → default | `runtime/core/structIndex.js` `normalizeLineStyle` | renderer で `"none"` は描画しない |
| `appearance.effect.effect_type` | `"none"|"pulse"|"flow"|"glow"` | `"none"` | 不正値 → default | `runtime/core/structIndex.js` `normalizeEffect` | 未指定時は relation から推定する場合あり |
| `appearance.effect.amplitude/speed/duration/phase/width` | `number` | `1` | 非数 → default | `runtime/core/structIndex.js` `normalizeEffect` | effect は `renderer/context.js` で一部補正 |
| `appearance.effect.loop` | `boolean` | `true` | 非 boolean → default | `runtime/core/structIndex.js` `normalizeEffect` |  |
| `appearance.effect.easing` | `"linear"|"ease-in"|"ease-out"|"ease-in-out"` | `"linear"` | 不正値 → default | `runtime/core/structIndex.js` `normalizeEffect` | renderer で `quad_*` に変換 |



## Error policy (observed)
- **無効値は基本的に「無視して default / fallback」**。例外投げはない。  
  - `frames` の無効値は「指定無し」扱いに倒す。  
  - `marker.text` の invalid は default 値へ正規化。
- **line endpoint が解決できない場合は line 全体を描画しない。**
- **色/不透明度は parse/clamp で吸収し、失敗時は fallback。**

## Legacy canonicalization (strictValidate=false only)
`runtime/bootstrapViewer.js` は strictValidate=false のときだけ **freeze 前に legacy 互換の正準化**を行い、以後は正準パスのみ参照する。

- `points[].uuid` / `lines[].uuid` / `aux[].uuid` → `meta.uuid`（`meta.uuid` が無い場合のみ）
- 点の位置 alias（`position`/`pos`/`xyz`/`geometry.position`/`meta.position`）→ `appearance.position`
+- `marker.text.plane` → `marker.text.pose`（`pose` が無い場合のみ、固定面の向きは schema v1.1.3 準拠で変換）※加えて runtime 側でも `pose` に legacy 文字列（`"xy"` 等）を渡されても吸収する
- `document_meta.i18n` object → string（`default_language` があればそれ、なければ `ja/en` fallback）

## Known gaps / TODO
- `touch_mask`, `ui_group`, `gltf` などのフィールドは **runtime/renderer 内で参照が見当たらない**。  
  → **TODO**: loader/normalize 層での参照有無を再調査し、存在する場合は追記する。
- 互換キー（`position` の `pos/xyz` など）は `renderer/adapters/compat.js` に集約されている。  
  → **TODO**: compat が本番経路で常に呼ばれているか、呼び出し箇所の監査が必要。

## Test hints
- `runtime/renderer/context.js` の `DEBUG_RENDERER` を有効化して、  
  **line endpoint 解決 / label 解釈**の debug log を確認する。  
- `runtime/core/computeVisibleSet.js` の frame/visible 判定を最小データで単体検証する。


# Viewer Interpretation Spec (implementation-derived)

> 対象：`apps/viewer/ssot/runtime` のうち、描画（特に text/label/marker）と index/visibleSet 連携に関わる実装から **「実際に参照してる 3DSS フィールド」**と **「解釈仕様（優先順位/デフォルト/未指定時）」**を抜き出したメモ。  
> ※ここに書いてるのは「理想」やなくて「現行実装の事実」やで。

---

## 0. スコープと前提（このドキュメントの根拠）

### 読んだ実装（今回の根拠）
- `runtime/renderer/context.js`
  - `ctx.syncDocument()`（points/lines/aux を three.js scene へ生成）
  - `labelLayer`（LabelLayer/LabelRuntime へ委譲）
  - `structIndex.bounds / structIndex.lineProfile` の利用
- `runtime/core/structIndex.js`
  - `buildUUIDIndex(doc)`（uuid / position / bounds / frameIndex / lineProfile 生成）
- `runtime/renderer/adapters/compat.js`
  - line endpoints/uuid/position の「形揺れ吸収」
- `runtime/utils/labelIndex.js`
  - `buildPointLabelIndex()`（marker.text と signification.name をマージして “ラベル仕様” に正規化）
- `runtime/renderer/labels/labelLayer.js`
  - wrapper（ほぼ薄い）
- `runtime/renderer/labels/labelRuntime.js`
  - visibleSet / cameraState を使ってラベルを cull・配置・スケール・アルファ調整
- `runtime/renderer/labels/labelSpec.js`
  - marker.text（size/align/pose/font）の正規化ルール

### 注意（bootstrapViewer.js / validator / freeze 周り）
- 今回提示された断片には `bootstrapViewer.js` 本体・AJV validator・freeze 処理の本文が無い。  
  なので **「読み込み～validate/freeze～index 構築」**のうち、ここに書けてるのは **structIndex と renderer が参照してる範囲**までや。  
  （`schema_uri` や `document_meta.version` の validator ルール等は、別章で取り込む必要あり）

---

## 1. データフロー（“このフィールドはこの経路で解釈される”）

### 1.1 points / lines / aux の生成経路
1) `buildUUIDIndex(doc)`（`runtime/core/structIndex.js`）  
   - `uuidToItem`, `pointPosition`, `lineEndpoints`, `bounds`, `lineProfile`, `frameIndex` を作る

2) `renderer/context.js: ctx.syncDocument(struct, structIndex)`  
   - root と `frames[]` を結合して `points/lines/aux` を収集（uuid で重複排除）
   - point は Sphere、line は LineSegments、aux は GridHelper/AxesHelper を生成
   - ラベルは `buildPointLabelIndex(struct)` → `labelLayer.sync(labelIndex, maps.points)` へ

### 1.2 ラベル（marker.text）の生成・描画経路
- **抽出（ドメイン層）**：`runtime/utils/labelIndex.js`
  - `points[].appearance.marker.text.*` と `points[].signification.name` から
    `Map<uuid, {text,size,align,pose,font}>` を作る
- **描画（レンダラ層）**：`runtime/renderer/labels/labelRuntime.js`
  - `visibleSet` / `cameraState` / `pointObjects(uuid->Object3D)` から
    位置・スケール・culling（距離/画面サイズ/frustum）・alpha を決める
  - pose の詳細（Sprite か Plane か、法線/クォータニオン）は `textSprite.js`（未提示）側で obj.userData に埋めてる前提

---

## 2. 「参照しているフィールド」一覧（パス表記）

### 2.1 document レベル
- `document_meta.i18n`
  - ラベルの言語選択（ja/en）に使用（`labelIndex.js`）

### 2.2 points（ラベル含む）
- `points[].meta.uuid`（必須扱い）
- `points[].appearance.position`
- `points[].appearance.color`
- `points[].appearance.opacity`
- `points[].signification.name`
- `points[].appearance.marker.text.content`
- `points[].appearance.marker.text.size`
- `points[].appearance.marker.text.align`
- `points[].appearance.marker.text.pose`
- `points[].appearance.marker.text.font`
- `points[].appearance.frames`（structIndex の frameIndex 生成に使用）

### 2.3 lines（endpoint/style/effect）
- `lines[].meta.uuid`（必須扱い）
- `lines[].appearance.end_a`
- `lines[].appearance.end_b`
- `lines[].appearance.line_style`
- `lines[].appearance.line_type`
- `lines[].appearance.effect`
- `lines[].appearance.frames`
- `lines[].appearance.color`
- `lines[].appearance.opacity`
- `lines[].signification.sense`
- `lines[].signification.relation.*`（family/kind 推定に使用）

### 2.4 aux（grid/axes）
- `aux[].meta.uuid`（必須扱い）
- `aux[].appearance.position`（structIndex の bounds に含める）
- `aux[].appearance.frames`
- `aux[].size` / `aux[].appearance.size` / `aux[].params.size`（Grid/Axes の size）
- `aux[].divisions` / `aux[].appearance.divisions` / `aux[].params.divisions`（Grid の divisions）
- ※ grid/axis 判定は **特定フィールド名やなく**、`aux` オブジェクト全体から文字列を shallow に拾って `"grid"|"axis"|"axes"` を含むかで判定（`compat.collectStringsShallow`）

### 2.5 frames（doc.frames）
- `frames[].points[] / frames[].lines[] / frames[].aux[]`
  - renderer と labelIndex の “収集対象” に入る（uuid 重複は最初の要素が勝つ）

---

## 3. フィールド解釈仕様（優先順位・デフォルト・単位）

## 3.1 UUID（同一性）
### 仕様（実装事実）
- points/lines/aux は **uuid が無いと描画対象にならん**
- 正規ルート
  - `node.meta.uuid`（structIndex/labelIndex の主ルート）
- renderer の互換吸収（`compat.pickUuidCompat`）
  - `obj.uuid` / `obj.meta.uuid` / `obj.id` / `obj.ref_uuid` 等も拾い得る

### 未指定時
- uuid が無い要素はスキップ（描画されへん）

---

## 3.2 座標（position / endpoint）
### point position
- **優先順位（renderer 側）**：`compat.readPointPos(p, readVec3)`  
  1) `p.appearance.position`  
  2) `p.position` / `p.pos` / `p.xyz`  
  3) `p.geometry.position` / `p.geometry.pos`  
  4) `p.meta.position` / `p.meta.pos`
- **単位**：ワールド座標（単位体系はドキュメント側に依存、renderer はメートル等の意味付けはしない）
- **未指定時**：その point は skip（`[renderer] skip point (no pos)`）

### line endpoint（A/B）
- renderer は `compat.pickLineEndpoint(line, END_A_KEYS|END_B_KEYS)` で “形揺れ” を吸収しつつ raw endpoint を取る
- endpoint 解決（`resolveEndpoint`）は以下を許容：
  - `"uuid"` 文字列 → point uuid として解決
  - `{ coord: [x,y,z] }` または coord が `{x,y,z}`
  - `[x,y,z]` / `{x,y,z}`
  - `{ ref: "uuid" }`
  - `{ ref: { uuid | point_uuid | ref_uuid | id | meta.uuid ... } }`
  - 直下に `uuid/point_uuid/...` が居るパターンも拾う
- **未指定/解決不能**：その line は skip（描画されへん）

---

## 3.3 色と不透明度（points/lines）
### points
- `color`：`p.appearance.color` → `p.color` → fallback `#ffffff`
- `opacity`：`p.appearance.opacity` → `p.opacity` → fallback `1`
- **未指定時**：白・不透明

### lines
- `color`：`line.appearance.color` → `line.color` → fallback `#ffffff`
- `opacity`：`line.appearance.opacity` → `line.opacity` → fallback `1`
- **未指定時**：白・不透明

---

## 3.4 points の見た目（Sphere）
- point は **SphereGeometry** で描く（最小実装）
- 半径 `baseR` は **ドキュメントのフィールドからは取ってない**  
  scene radius から自動決定：
  - `baseR = clamp(sceneRadius*0.02, 0.2..2.0)`（sceneRadius がある場合）
  - 無い場合 `0.6`
- つまり現状は `points[].appearance.size` みたいな拡張があっても効かん（未対応）

---

## 3.5 labels（marker.text）— 抽出仕様（labelIndex.js）

### 3.5.1 ラベル有無
- 対象：points のみ（lines/aux の label は現状無し）
- ラベル生成条件：
  - `marker.text.content` が non-empty → それ採用
  - それが空なら `signification.name` を言語選択して採用
  - 両方空 → ラベル無し（index に含めない）

### 3.5.2 言語選択（signification.name の取り方）
- `document_meta.i18n` を参照
  - 受理値：`"ja"|"en"`（それ以外は `"ja"` 扱い）
  - 互換：`{default_language: "ja"}`、`{ja:"...",en:"..."}` なども吸収
- `signification.name` が `{ja,en}` の場合のフォールバック順
  1) 指定 lang
  2) `ja`
  3) `en`
  4) object 内の最初の string プロパティ

### 3.5.3 marker.text の正規化（size/align/pose/font）
- `size`：`marker.text.size`
  - 数値 > 0 なら採用、そうでなければ default `8`
  - **単位**：後段の world height 計算の “係数” として扱われる（= ピクセルではない）
- `align`：`marker.text.align`
  - 例：`"left&top"`, `"center&middle"`, `"right baseline"` 等
  - 不正なら default `"center&middle"`
  - 正規化後は `{x,y}`（0..1）を持つ
- `pose`：`marker.text.pose`
  - 文字列 shorthand：`"billboard"|"xy"|"yz"|"zx"` を受ける
  - object 形：`{mode:"billboard", up:"+z", roll:0}` / `{mode:"fixed", front:"+z", up:"+y"}`
  - default：`{mode:"billboard", up:"+z", roll:0}`
- `font`：`marker.text.font`
  - object：`{family, style, weight}`
  - string：先頭2トークンまでを `style/weight` として解釈、残りを family 扱い
  - default：system-ui 系（token `"helvetiker_regular"` は “指定なし同等” 扱い）

---

## 3.6 labels（marker.text）— 描画仕様（labelRuntime.js）

### 3.6.1 表示/非表示（visibleSet 契約）
- label は **visibleSet に入ってる uuid だけ表示**
- visibleSet 形状：
  - 旧：`Set<uuid>`
  - 新：`{points:Set, lines:Set, aux:Set}`（どれかに入ってたら表示）

### 3.6.2 位置（point 追従）
- label は対応する `pointObjects.get(uuid).position` に追従
- さらに “持ち上げ” を入れる：
  - up 軸：`labelConfig.world.upAxis`（既定 `"z"`、互換で `"y"` も可）
  - lift：`lift = h * offsetYFactor`（既定 offsetYFactor=0.6）
  - `obj.position.z += lift`（Z-up の場合）

### 3.6.3 サイズ（world height）
- 基本高さ `baseHeight`：
  - `baseHeight = cameraDistance * labelConfig.world.scalePerCameraDistance`（設定されてれば）
  - 無ければ `labelConfig.world.baseHeight`（既定 0.2）
  - `minHeight/maxHeight` が設定されてれば clamp
- `marker.text.size` は **スケール係数**：
  - `sizeFactor = size / baseLabelSize`（baseLabelSize 既定 8）
  - `h = baseHeight * sizeFactor`
- 実際のスケール：
  - `obj.scale = (h*aspect, h, 1)` を基準に、microFX で少し倍率を掛ける

### 3.6.4 align（アンカー）
- `align.x/y`（0..1）を使って、ラベル平面の中心(0.5,0.5)からのズレを
  - `dx = (0.5-alignX)*obj.scale.x`
  - `dy = (0.5-alignY)*obj.scale.y`
  - を quaternion で回して position に足し込む（allocation 無し）

### 3.6.5 pose（billboard / fixed）
- billboard：
  - `obj.isSprite === true` を前提に処理分岐してる（= Sprite なら自動でカメラ正対）
- fixed：
  - `obj.userData.__labelBaseQuat` と `obj.userData.__labelNormal` を前提に
    「カメラが裏側に回ったら local-Y で 180° flip」して **裏文字（鏡像）を防ぐ**
  - ※ baseQuat/normal をどう作るかは `textSprite.js`（未提示）側の責務

### 3.6.6 LOD / culling（ラベルの間引き）
- `labelConfig.lod.enabled !== false` のとき有効
- throttle：
  - `lod.throttleMs > 0` なら、カメラが動いてる間は更新頻度を落とす
- distance cull：
  - `lod.distance.maxDistance` もしくは `maxDistanceFactor * cameraDistance`
- fade：
  - `lod.distance.fadeStart` もしくは `fadeStartFactor * maxDistance`
- screen-size cull（近似）：
  - `lod.screenSize.minPixels` と viewport 高さから
    おおよその画面 px を計算して小さすぎたら切る
- frustum cull：
  - `lod.frustum.enabled` かつ three camera が渡ってる時だけ

### 3.6.7 microFX の影響（ラベル）
- microFX は **位置や可視判定は触らず**、`opacity` と `scale` だけを調整
- focus/related/degree で alpha を変える（degreeAlpha 配列）

---

## 3.7 lines — style / effect（structIndex → renderer）
### lineProfile（structIndex が作る）
- `signification.relation.*` から family/kind を推定（structural/dynamic/logical/temporal/meta）
- `signification.sense`（default `"a_to_b"`、許容：`a_to_b|b_to_a|bidirectional|neutral`）
- `appearance.line_type`（default `"straight"`、許容 set 以外は `"straight"`）
- `appearance.line_style`（default `"solid"`、許容 set 以外は `"solid"`）
- `appearance.effect`（default は relation から推定して effect_type を入れることがある）

### renderer の実際の描画
- `lineStyle === "none"` は描画しない
- dashed material を使う条件：
  - `lineStyle in ("dashed","dotted")` **または** `effectType === "flow"`
- dashSize/gapSize は **線長から自動算出**
  - dotted：`dash=len/60, gap=len/20`（clamp あり）
  - dashed：`dash=len/12, gap=dash*0.6`（clamp あり）
- effect の向き：
  - `effectType==="flow"` で `effect.direction` が無ければ
    `sense==="b_to_a"` → `"backward"`、それ以外 → `"forward"`
- renderer は `seg.userData` に以下を埋める（lineEffectsRuntime が読む）
  - `lineStyle`, `sense`, `effectType`, `effect`

---

## 3.8 aux — grid/axes
- aux は **文字列スキャンで grid/axis を判定**（フィールド固定じゃない）
- grid：
  - `size`: `a.size || a.appearance.size || a.params.size || 40`
  - `divisions`: `a.divisions || a.appearance.divisions || a.params.divisions || 20`
  - Z-up に合わせて `rotation.x = PI/2`
- axes：
  - `len`: `a.size || a.appearance.size || 12`

---

## 4. モジュール別 “対応表”（このフィールドはこの経路で解釈）

### 4.1 ラベル（marker.text）系
- `document_meta.i18n`
  - `labelIndex.buildPointLabelIndex()` → `normalizeLangCode()`  
  - 目的：`signification.name` の言語選択

- `points[].signification.name`
  - `labelIndex.normalizePointName()`  
  - 目的：content 無指定時のラベル文字列

- `points[].appearance.marker.text.content`
  - `labelIndex.buildPointLabelFromPoint()`  
  - 優先：content が non-empty なら最優先で採用

- `points[].appearance.marker.text.size`
  - `labelSpec.normalizeTextSize()` → `labelRuntime.update()`（world height 係数）
  - default：8

- `points[].appearance.marker.text.align`
  - `labelSpec.normalizeTextAlign()` → `labelRuntime.update()`（アンカー）
  - default：center&middle

- `points[].appearance.marker.text.pose`
  - `labelSpec.normalizeTextPose()` → `textSprite.js`（obj 生成/姿勢）→ `labelRuntime.update()`（裏返り防止 flip）
  - default：billboard +z

- `points[].appearance.marker.text.font`
  - `labelSpec.normalizeTextFont()` → `textSprite.js`（canvas font 生成）
  - default：system-ui

### 4.2 geometry / style（points/lines/aux）
- `*.meta.uuid`
  - `structIndex.buildUUIDIndex()`（主ルート）
  - `compat.pickUuidCompat()`（renderer 側の追加互換）

- `points[].appearance.position`
  - `structIndex.pointPosition`（sanitizeVec3 は配列のみ）
  - `renderer/context.resolvePointPos()`（compat.readPointPos で幅広互換）

- `lines[].appearance.end_a / end_b`
  - `structIndex.lineEndpoints`（保持のみ）
  - `renderer/context.resolveEndpoint()`（解決は renderer 側）

- `lines[].appearance.line_style / effect / signification.sense / relation`
  - `structIndex.lineProfile`（正規化）
  - `renderer/context.syncDocument()`（material と userData へ反映）

- `aux` の grid/axes 判定と size/divisions
  - `renderer/context.syncDocument()`（collectStringsShallow + 互換キー拾い）

---

## 5. 未対応フィールドの扱い提案（無視 / warn / TODO）

> 方針案：**入力側が“効くと思って入れがち”で、今は効かんやつ**は `console.warn`（dev限定でも可）。  
> 逆に、将来仕様が固まってない・影響がデカいもんは TODO として沈める。

### 5.1 marker.text.plane（例：`points[].appearance.marker.text.plane`）
- **現状**：参照してへん（pose を見る）
- **提案**：
  - A) 互換吸収（おすすめ）：`pose` が無い時だけ `plane` を `pose` の string shorthand として扱う  
    - `"xy"|"yz"|"zx"|"billboard"` を `normalizeTextPose()` に流す
  - B) warn：`plane` があるのに `pose` が無い場合に 1回 warn（uuid 付き）
  - C) 無視：仕様確定まで放置（ただしユーザー混乱は増える）

### 5.2 points のサイズ/形（例：`points[].appearance.size`）
- **現状**：sphere 半径は sceneRadius から自動、フィールド参照なし
- **提案**：
  - TODO：`appearance.point_radius`（仮）を導入するなら renderer が読む箇所は明確（SphereGeometry の半径決定部）

### 5.3 label の色/不透明度/縁取り等（marker.text.color 等）
- **現状**：提示範囲では不明（`textSprite.js` 次第）
- **提案**：
  - TODO：`textSprite.js` 側の実装を確認してから仕様化
  - warn は時期尚早（“効く/効かん”の確定ができへん）

### 5.4 frame 内での同一 uuid 上書き
- **現状**：root → frames の順で収集、uuid 重複は “最初が勝つ”  
  frame 側の差分上書き用途には使えへん
- **提案**：
  - TODO：上書き用途を許すなら収集順（frames 優先）を変えるか、merge ルールを決める必要あり
  - ただし現状の用途が “登場集合を増やすだけ” なら今のままでOK

---

## 6. 最小テスト案（fixture 1つ + 観点リスト）

### 6.1 推奨 fixture（小さめ）
- points：2点（uuid 固定）
- lines：1本（end_a/end_b で uuid 参照）
- aux：grid 1つ（文字列に "grid" を含む何か）
- marker.text：片方の point にだけ付ける

### 6.2 観点（「値を変えたら見た目がこう変わる」）
#### ラベル文字列
- `marker.text.content` を空にする → `signification.name` にフォールバックするか
- `document_meta.i18n="en"` にする → `{ja,en}` の en が出るか

#### size（相対スケール）
- `marker.text.size: 8 → 16`  
  → world height が約2倍になるか（カメラ距離連動設定の有無も見る）

#### align（アンカー）
- `align: "left&top" / "center&middle" / "right&baseline"`  
  → point に対してラベルの起点が移動するか

#### pose（billboard / fixed）
- `pose: "billboard"` → 常にカメラ正対か（回転しても読めるか）
- `pose: "xy"`（fixed）→ ある平面に固定されるか、裏に回った時に鏡像にならず flip されるか

#### LOD（距離/画面サイズ）
- カメラを遠ざける → `maxDistance` 超えで label が消えるか
- 画面上で小さくなる → `minPixels` 下回りで消えるか（設定が有効なら）

#### lines（style/effect）
- `appearance.line_style: solid/dashed/dotted/none`  
  → dashed/dotted の見え方、none で非表示
- `appearance.effect.effect_type: flow`  
  → dashed 扱いになって flow 表現が走るか（lineEffectsRuntime の挙動確認）

#### aux（grid）
- `aux.size / aux.divisions` を変える → grid の大きさ/密度が変わるか

---

## 7. shared.js の実使用状況（現状の結論）
+- `runtime/renderer/shared.js` は現行の runtime 参照経路から外れており、仕様ドキュメント側の記述を最新の経路（`renderer/context.js` / `renderer/adapters/compat.js`）へ更新すること。
- clamp01 も microFX/labelRuntime はそれぞれローカル実装を持ってる
- 提案：
  - A) `context.js` から shared.js import を消して依存を整理
  - B) 逆に shared.js に寄せるなら、labelRuntime/microFX/utils まで含めて統一する（ただし影響範囲は増える）
