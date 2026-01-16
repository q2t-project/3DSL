# Viewer Hosting & Exception Hosts Policy (SSOT)

## 目的
Viewer の SSOT / レイヤリング（entry → hub → core → renderer → ui）を壊さないために、
「例外ホスト（peekBoot 等）」の許容範囲を **明文化** し、逸脱を防止する。

この文書は SSOT_POLICY の補助規範であり、**manifest に記載されたレイヤ規則を上書きしない**。

## 例外ホストの目的
例外ホストは **例外** として最小限に維持し、以下の目的に限定する。
- **UI を持たない最小表示**（ホーム/埋め込み/軽量）
- **renderer + orbit input の単機能検証**
- **検証・デバッグ用の隔離環境**（特権アクセスは明示的に隔離）

## 例外ホストの分類（最低 3 区分）
### A. UI無し（No-UI Host）
- **UI 層を import しない**（ui/ への依存禁止）
- renderer の公開 API / input の公開 API のみを使用
- hub/core への直接アクセスは禁止（public entry を経由すること）

### B. renderer + orbit のみ（Renderer+Orbit Host）
- renderer + input（orbit）に限定
- hub/core への直接アクセスは禁止
- UI 層は **禁止**

### C. 例外入口（Debug/Privilege Host）
- デバッグ・検証のため **限定的な特権アクセス** を許容
- **明示的に隔離**（命名・配置・警告コメントが必須）
- UI との依存や dev 用グローバル露出は許容だが **最小限**

## 許可・禁止ルール（明文化）
### 許可（Allowed）
- host → entry（bootstrapViewer / bootstrapViewerFromUrl）  
- host → ui（UI 付与・オーバーレイ、デバッグ UI を含む）
- **例外ホストでも ports の公開 API を優先する**

### 禁止（Forbidden）
- 例外ホストが **ui を import** するのに UI 以外の層（hub/core/renderer）へ直接侵入
- host が **hub を直接操作**（UI 経由が原則）
- host が **core/renderer 内部** を直 import
- 例外ホストが **DOM contract / embed contract** を破る

## 例外ホスト一覧（現状）
| Path | 分類 | 想定レイヤ | 直接 import している層メモ |
|---|---|---|---|
| `/viewer/peekBoot.js` | A. UI無し | host | entry（bootstrapViewerFromUrl） |
| `/viewer/peek.html` | A. UI無し | host | peekBoot のみ |
| `/viewer/peek/index.html` | A. UI無し | host | peekBoot のみ |
| `/viewer/viewerDevHarness.js` | C. 例外入口 | host | entry（bootstrapViewerFromUrl）, ui（attachUiProfile/detailView 等） |
| `/viewer/viewer_dev.html` | C. 例外入口 | host | viewerDevHarness のみ |

> **分類 B（renderer+orbitのみ）** は現状の該当なし。  
> 追加する場合は「追加時チェックリスト」に従う。

## Minimal Host allowlist（SSOT）
- **対象エントリ**: `peekBoot.js`（`minimalHostEntries` の key は実ファイル名に一致させる）
- **許可 import**: `runtime/bootstrapViewer.js` のみ
- **禁止 import**: `ui/**`, `runtime/core/**`, `runtime/renderer/**`, `runtime/viewerHub.js` など
- **理由**: “UI なし” の最小ホストは entry を経由し、UI/内部実装への依存を封じる

> この allowlist は `scripts/check-forbidden-imports.mjs` で静的に強制する。

## 追加時チェックリスト（例外ホストを増やす場合）
1. **命名規約**: `exception` / `peek` / `dev` など意図が分かる名前を採用  
2. **配置**: `/viewer/` 直下 or `/viewer/peek/` 等に隔離  
3. **先頭コメント**: `SSOT_EXCEPTION_HOST` + 分類 + 禁止事項を明記  
4. **依存経路**: ports / 公開 API を使用（内部 import を禁止）  
5. **manifest 追記**: 例外一覧を更新（この文書 + 必要なら manifest 参照）

- importmap の three は /vendor/... 固定
 - check-host-asset-paths を通す

## 例外ホストの先頭コメント（テンプレ）
```text
// SSOT_EXCEPTION_HOST: <分類名>
// Purpose: <目的>
// Allowed: <許可 import / 公開 API>
// Forbidden: <禁止 import>
```

## 自動チェックの位置づけ
- 例外ホストは **forbidden-imports / ports-conformance** の対象。
- 例外ホストの allowlist（分類ごとの許可 import）は、
  `scripts/check-forbidden-imports.mjs` への拡張で **分類別 allowlist を注入**する形が望ましい。
  - 例: `exception_hosts` という allowlist を manifest に追加 → checker で制限