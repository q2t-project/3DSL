
# 3DSL Viewer DOM Contract
version: 2026-01-09

この文書は Viewer UI（public/viewer/ui/*）が依存する DOM の契約である。
Tailwind の class / レイアウト構造は自由だが、以下の **アンカー属性**は固定する：

- id
- data-role（推奨：将来 id 依存を減らすため）
- input/select の type（range / select など）

## 原則
- UI layer は **state を読む → DOM 更新**のみ行う
- state 書き込みは **hub/core の公開 API 経由**のみ（single-writer）
- DOM が欠けても落とさず、該当機能だけ disable し warn を出す（robust）

## 例外（fail-fast）
- **prod_full / devHarness_full は「フレーム＋フィルタ必須」固定**
- 必須 DOM が欠けている場合、UI 初期化は **即エラーで停止**する
  - “半分だけ動いて原因不明” を避けるため

---

## Profiles
- prod_minimal: 最小UI（gizmo 等のみ）
- prod_full: 通常UI（picker/keyboard/timeline/controls）
- devHarness_full: 開発用（prod_full + メタ/ログ/デバッグ要素）

---

## 共通（全 profile）必須
| role | selector (preferred) | selector (fallback) | required | type/attrs |
|---|---|---|---|---|
+| viewerCanvas | `[data-role="viewer-canvas"]` | `#viewer-canvas` | YES | `<canvas>` |
| hudToast | `[data-role="viewer-hud"]` | `#viewer-hud` | NO | `<div>`（toast表示） |
| orbitHint | `[data-role="orbit-hint"]` | `#orbit-hint` | NO | `<div>`（Orbit操作ヒント） |
| perfHud | `[data-role="perf-hud"]` | `#perf-hud` | NO | `<div>`（debug/perf表示。dev限定で使用） |


---

## prod_minimal 必須
| role | selector (preferred) | selector (fallback) | required | type/attrs |
|---|---|---|---|---|
| gizmoSlot | `[data-role="gizmo-slot"]` | `#gizmo-slot` | YES | gizmo canvas が差し込まれる枠 |
| gizmoModeLabel | `[data-role="gizmo-mode-label"]` | `#gizmo-mode-label` | NO | `<span>`（結果モード表示） |

（任意）
- world axes toggle / preset view / auto orbit はページ側が用意してれば動く、無ければ黙って無効

---

## prod_full 必須（prod_minimal + 追加）
### Filters
| role | preferred | fallback | required | type/attrs |
|---|---|---|---|---|
| filterLines | `[data-role="filter-lines"]` | `#filter-lines` | YES | `<button>` |
| filterPoints | `[data-role="filter-points"]` | `#filter-points` | YES | `<button>` |
| filterAux | `[data-role="filter-aux"]` | `#filter-aux` | YES | `<button>` |

### Frame controls
| role | preferred | fallback | required | type/attrs |
|---|---|---|---|---|
| btnPlay | `[data-role="btn-play"]` | `#btn-play` | YES | `<button>` |
| btnRew | `[data-role="btn-rew"]` | `#btn-rew` | YES | `<button>` |
| btnFf | `[data-role="btn-ff"]` | `#btn-ff` | YES | `<button>` |
| btnStepBack | `[data-role="btn-step-back"]` | `#btn-step-back` | YES | `<button>` |
| btnStepForward | `[data-role="btn-step-forward"]` | `#btn-step-forward` | YES | `<button>` |
| frameSlider | `[data-role="frame-slider"]` | `#frame-slider` | YES | `<input type="range">` |
| frameLabelMin | `[data-role="frame-label-min"]` | `#frame-label-min` | YES | `<span/div>` |
| frameLabelMax | `[data-role="frame-label-max"]` | `#frame-label-max` | YES | `<span/div>` |
| frameLabelZero | `[data-role="frame-label-zero"]` | `#frame-label-zero` | NO | `<span/div>` |
| frameLabelCurrent | `[data-role="frame-label-current"]` | `#frame-label-current` | YES | `<span/div>` |
| frameZeroLine | `[data-role="frame-zero-line"]` | `#frame-zero-line` | NO | `<div>` |

### Viewer settings
| role | preferred | fallback | required | type/attrs |
|---|---|---|---|---|
| vsLineWidthMode | `[data-role="vs-linewidth-mode"]` | `#vs-linewidth-mode` | NO | `<select>` |
| vsMicroProfile | `[data-role="vs-micro-profile"]` | `#vs-micro-profile` | NO | `<select>` |

### Gizmo extras / Camera
| role | preferred | fallback | required | type/attrs |
|---|---|---|---|---|
| worldAxesToggle | `[data-role="world-axes-toggle"]` | `#world-axes-toggle` | NO | `<button aria-pressed>` |
| presetViewToggle | `[data-role="gizmo-presets-toggle"]` | `#gizmo-presets-toggle` | NO | `<button>` |
| autoOrbitSlot | `[data-role="auto-orbit-slot"]` | `#auto-orbit-slot` | NO | `<div>` |
| autoOrbitToggle | `[data-role="auto-orbit-toggle"]` | `#auto-orbit-toggle` | NO | `<button>` |
| autoOrbitSpeedDown | `[data-role="auto-orbit-speed-down"]` | `#auto-orbit-speed-down` | NO | `<button>` |
| autoOrbitCW | `.auto-orbit-btn-dir[data-dir="cw"]` | 同左 | NO | `<button data-dir="cw">` |
| autoOrbitCCW | `.auto-orbit-btn-dir[data-dir="ccw"]` | 同左 | NO | `<button data-dir="ccw">` |
| autoOrbitSpeedUp | `[data-role="auto-orbit-speed-up"]` | `#auto-orbit-speed-up` | NO | `<button>` |

### Detail view
| role | preferred | fallback | required | type/attrs |
|---|---|---|---|---|
| detailRoot | `[data-role="viewer-detail"]` | `#viewer-detail` | NO | detailView の挿入先 |

---

## devHarness_full 必須（prod_full + 追加）
### Meta panels（viewerDevHarness のみ）
| role | preferred | fallback | required | type/attrs |
|---|---|---|---|---|
| metaFile | `[data-role="meta-file"]` | `#meta-file` | YES | `<section/div>` |
| metaModel | `[data-role="meta-model"]` | `#meta-model` | YES | `<section/div>` |
| metaModelLog | `[data-role="meta-model-log"]` | `#meta-model-log` | YES | `<div>` |

### Document caption（右上カード）
| role | preferred | fallback | required | type/attrs |
|---|---|---|---|---|
| docCaptionTitle | `[data-role="doc-caption-title"]` | `#doc-caption-title` | NO | `<div>` |
| docCaptionBody | `[data-role="doc-caption-body"]` | `#doc-caption-body` | NO | `<div>` |

---

## 注意：mode表示は「要求」ではなく「結果」を表示する
UI は原則 `hub.core.uiState.runtime.status.effective.mode` を表示する。
debug のみ、要求(req)とブロック要因(blockedBy)を補助表示してよい。
