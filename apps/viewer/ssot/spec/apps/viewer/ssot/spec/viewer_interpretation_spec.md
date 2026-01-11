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
| `document_meta.i18n` | `string` | `"ja"` | 非文字列 → `"ja"` | `runtime/renderer/labels/labelIndex.js` `buildPointLabelIndex` | label 言語の優先順に影響 |
| `signification.name` | `string` or `{[lang]:string}` | `null`（空ならラベル無し） | 空文字/空白 → `null` | `runtime/renderer/labels/labelIndex.js` `normalizePointName` | `marker.text.content` が無い場合の fallback |
| `appearance.marker.text.content` | `string` | `signification.name` にフォールバック | 空/空白 → `null`（ラベル無し） | `runtime/renderer/labels/labelIndex.js` `buildPointLabelFromPoint` | `marker.text` が無い場合は `signification.name` へ |
| `appearance.marker.text.size` | `number`（`>0`） | `LABEL_TEXT_DEFAULTS.size` | `<=0` or NaN → default | `runtime/renderer/labels/labelSpec.js` `normalizeTextSize` | default は `labelSpec.js` |
| `appearance.marker.text.align` | `"left top"` など（`left/center/right` × `top/middle/baseline`） | `LABEL_TEXT_DEFAULTS.align` | 不正値 → default | `runtime/renderer/labels/labelSpec.js` `normalizeTextAlign` | `"left"` のような単独指定は `middle` 補完 |
| `appearance.marker.text.plane` | `"xy"|"yz"|"zx"|"billboard"` | `LABEL_TEXT_DEFAULTS.plane` | 不正値 → default | `runtime/renderer/labels/labelSpec.js` `normalizeTextPlane` | `"billboard"` は Sprite 化 |
| `appearance.marker.text.font` | `string` or `{family, style, weight}` | `LABEL_FONT_DEFAULT_FAMILY` | 不正 `style/weight` → `"normal"` | `runtime/renderer/labels/labelSpec.js` `normalizeTextFont` | `LABEL_TEXT_DEFAULTS.fontToken` はデフォルト扱い |
| `appearance.position` | `[x,y,z]` 数値配列 | `[0,0,0]` | 配列/数値でない場合 → fallback | `runtime/core/structIndex.js` `sanitizeVec3` / `runtime/renderer/shared.js` `getPointPosition` | `renderer/adapters/compat.js` で互換パスも読む |
| `appearance.color` | `string` or `number` | `#ffffff` / `0xffffff` | parse 失敗 → fallback | `runtime/renderer/shared.js` `getColor` / `runtime/renderer/context.js` `readColor` | `color` 直下も fallback 対象 |
| `appearance.opacity` | `number` | `1.0` | NaN → default、`<0`/`>1` → clamp | `runtime/renderer/shared.js` `getOpacity` / `runtime/renderer/context.js` `readOpacity` | `opacity` 直下も fallback 対象 |
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

## Known gaps / TODO
- `touch_mask`, `ui_group`, `gltf` などのフィールドは **runtime/renderer 内で参照が見当たらない**。  
  → **TODO**: loader/normalize 層での参照有無を再調査し、存在する場合は追記する。
- 互換キー（`position` の `pos/xyz` など）は `renderer/adapters/compat.js` に集約されている。  
  → **TODO**: compat が本番経路で常に呼ばれているか、呼び出し箇所の監査が必要。

## Test hints
- `runtime/renderer/context.js` の `DEBUG_RENDERER` を有効化して、  
  **line endpoint 解決 / label 解釈**の debug log を確認する。  
- `runtime/core/computeVisibleSet.js` の frame/visible 判定を最小データで単体検証する。