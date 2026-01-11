# Layering / Ports Audit (Viewer)

## Summary
- **Forbidden-import scan:** 0 violations
- **Ports conformance scan:** 0 violations

> Note: ports-conformance は `hub.<topProp>` のトークンスキャン（ヒューリスティック）であり、
> 返り値の別名参照・分割呼び出し・ブラケット参照等は検知対象外。

Scans executed:
- `node apps/viewer/ssot/scripts/check-forbidden-imports.mjs`
- `node apps/viewer/ssot/scripts/check-ports-conformance.mjs`

## Layer mapping (current checker)
Source of truth: `scripts/check-forbidden-imports.mjs` の `layerOf()`。

| Layer | Directory mapping |
|---|---|
| entry | `runtime/bootstrapViewer.js` |
| hub | `runtime/viewerHub.js` |
| core | `runtime/core/**` |
| renderer | `runtime/renderer/**` |
| ui | `ui/**` |
| host | `*.html`, `*.css`, および上記以外のファイル（checker既定値） |

> 暫定: それ以外は host 扱い（checker 既定値）。

## Violations
現時点では **違反なし**（上記の両チェックで OK）。  
違反が出た場合は以下の表に列挙する。

| from (file) | to (import target) | from_layer → to_layer | reason | proposed fix |
|---|---|---|---|---|
| _none_ | _none_ | _none_ | _none_ | _none_ |

## Known limitations
- `check-ports-conformance.mjs` は `ui/**` 内の `hub.<prop>` のみをスキャンし、
  `const x = hub; x.start()` のような別名経由は検知しない。
- host 側の ports-conformance は対象ファイルが限定（現状: `viewerHost.js`, `viewerDevHarness.js`, `viewerHostBoot.js`）。
  例外ホスト（`peekBoot.js` 等）も対象に含める場合はチェッカー側を拡張する

## Minimal fix strategy (template)
違反が出た場合は、**最小差分**で以下の方針を適用する。
1. **正規ルートへ寄せる**（entry → hub → core → renderer → ui）
2. 依存方向を直せない場合は **ports 追加 / public API へ引き上げ**
3. 置換が単純な場合は **自動修正可能** と明記

## Automation proposal
既存のチェックを CI に組み込み済み（manifest `checks`）。
追加提案:
- 例外ホスト分類 allowlist を manifest に追加し、
  `check-forbidden-imports.mjs` で **分類ごとの許容 import** を強制。
