# MARKER_TEXT_INTERP.md

## Overview

3DSL Viewer における **points.appearance.marker.text**（以下 `marker.text`）の解釈仕様を固定する。

- 対象: viewer アプリ側（3DSD-viewer）
- 実装範囲:
  - 正規化（domain）: `runtime/renderer/labels/labelIndex.js`, `runtime/renderer/labels/labelSpec.js`
  - 表示（renderer）: `runtime/renderer/labels/labelRuntime.js`, `runtime/renderer/labels/textSprite.js`

## Data model

`marker.text` は次のフィールドを持つ（任意）。

- `content: string` … 表示文字列
- `size: number` … ラベルの相対サイズ（unitless）
- `align: string` … アンカー位置
- `plane: string` … 表示平面
- `font: string | { family: string, style?: string, weight?: string }` … フォント指定

## Interpretation rules

### content

表示文字列は次の順で決める。

1. `marker.text.content` が non-empty ならそれを採用
2. そうでなければ `signification.name` を言語設定に応じて 1 本の string に正規化して採用

両方が空なら「ラベル無し」として扱う。

### size

- `size` は **world 空間での高さ**へ変換されるための相対値（unitless）。
- 実際の world 高さは `labelConfig.world` と camera distance を元に renderer 側で決める。

### align

- `"left" | "center" | "right"` と `"top" | "middle" | "baseline"` を `"&"` で連結して指定する。
  - 例: `"left top"`, `"center middle"`, `"right baseline"`
- 不正値はデフォルトへフォールバックする。

### plane

- `"xy" | "yz" | "zx" | "billboard"` を受け付ける。
- 不正値はデフォルトへフォールバックする。

#### Coordinate / orientation

Viewer の座標系は **Z-up** を前提とする。

固定平面の法線（正面方向）は次で定義する。

- `xy`: `+Z`
- `yz`: `+X`
- `zx`: `+Y`

`billboard` は常にカメラ正面へ向ける。

#### Backside mirroring fix

固定平面（`xy/yz/zx`）は、カメラが裏側に回り込んだ場合に **180° 回転**して常に正面向きにし、
裏面表示による鏡像（左右反転）を避ける。

- 実装: `labelRuntime.js` が camera position を推定し、平面法線との符号で反転を決定
- 回転軸: ラベル平面の **ローカル Y 軸**（文字の上方向を保持）

### font

- `font` が object の場合は `family/style/weight` を採用し、`style` は `normal|italic|oblique`、
  `weight` は `normal|bold|bolder|lighter|100..900` を有効とする。
- `font` が string の場合は CSS の `font-family` として扱う（先頭に `style/weight` が付く場合は解釈する）。
- 不正値はデフォルトへフォールバックする。

## Defaults

Viewer 側デフォルト（`labelSpec.js`）

- `content`: `signification.name`（フォールバック）
- `size`: `8`
- `align`: `center middle`
- `plane`: `zx`
- `font`: `helvetiker_regular` 相当（実装では system font へフォールバック）

## Compatibility notes

- 既存サンプルの `marker.text` を壊さずに、未設定値はフォールバックで救済する。
- `plane` 固定の裏面問題は viewer 実装側で吸収する（3DSS データへ追加要件を課さない）。
