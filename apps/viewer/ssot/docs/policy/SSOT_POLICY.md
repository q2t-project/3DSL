
# Viewer SSOT Policy (Constitution)

この文書は Viewer の「憲法」であり、設計・実装・運用における “正 (truth)” の所在と、
変更の正規手順、例外の扱い、成果物の分類を定義する。


## 0. 目的

- “正 (truth)” を 1 箇所に固定し、規範の二重化・死に規範化・後付け正当化による越境を防ぐ
- 「動くけど規範とズレてる」を不合格にするための、判断基準と手順を与える
- 例外（peekBoot 等）を例外として閉じ込め、設計崩壊の温床を消す

### 関連文書

- SSOT / Mirror / Build Outputs definitions:
  - packages/docs/SSOT_MIRROR_BUILD_POLICY.md

## 1. SSOT（Single Source of Truth）

### 1.1 SSOT root

- Viewer の SSOT root は **`/viewer/manifest.yaml`** とする
- 以下の “最終決定” は **manifest に集約**する
  - レイヤ（layers）
  - 依存ルール（dependency_rules / forbidden imports）
  - ports（越境口）
  - entrypoints（起動点）
  - checks（強制ルール）
  - generated（生成物定義）
  - exceptions（例外一覧・期限・撤去条件）

**manifest に書かれていないルールは「運用メモ」扱いで、規範としては扱わない。**


### 1.2 SSOT のスコープ（A方針）

- manifest は **境界と統治に特化**する（ports / layers / dependency_rules / checks / generated / exceptions）
- 詳細仕様本文（設計意図・例・アルゴリズム解説など）は Human Spec に置く
- Human Spec のうち **manifest から参照されているものだけ**を「正の一次資料」として扱う
- viewer のエラー表示はdocs/contracts/ERROR_HANDLING.md を唯一の正とする

## 2. 成果物の分類（Artifact Taxonomy）

### 2.1 SSOT（機械可読・運用の真実）

- `/viewer/manifest.yaml`
  - layers / dependency_rules
  - ports
  - entrypoints
  - checks
  - generated
  - exceptions（例外）

### 2.2 Human Spec（人間向け規範）

- 例：`/viewer/3DSD-viewer.md`、`/viewer/viewer_dom_contract.md`、`/viewer/spec/*.md`
- **manifest から参照されているものだけ**を「正の一次資料」として扱う
- 参照されていない spec は deprecated（廃棄候補）

### 2.3 Generated Artifacts（生成物）

- 例：`/viewer/_generated/PORTS.md`
- 生成物は **手編集禁止**
- 差分が出たら generator か manifest を直す

### 2.4 置き場の固定（Placement Rules）

- 生成物は **`/viewer/_generated/`** に固定（手編集禁止）
- 死に規範 / 退役メモは **`/viewer/spec/_legacy/`** に固定


## 3. レイヤと越境（Ports）

### 3.1 Port の定義

Port は「**レイヤ境界を跨いで呼んでよい公開口**」を指す。

- 同一レイヤ内の export は internal API（port ではない）
- port は最低限、以下を持つ
  - caller layer / callee layer
  - surface（関数・イベント・オブジェクト形状）
  - stability（stable / experimental / deprecated）

### 3.2 Port のスコープ（Viewer）

Viewer の ports 一覧に含めるのは、次の越境口のみに限定する。

- **host → entry**
- **ui → hub**
- **hub → core**
- **hub → renderer**

補足：

- **entry → core / entry → renderer** は「内部結線（composition root）」であり ports には含めない（別枠）
- **host は hub を直接操作しない**。hub の操作は ui（＝ハーネス / インタラクション層）経由に統一する

### 3.3 deprecated / compat の扱い

- 互換ラッパ（compat）は **ports に含めない**
- compat は manifest の `deprecated.compat` に明記し、
  - 撤去期限（until）
  - 撤去条件（exit criteria）
  を必ず持たせる
- 新規実装は compat に依存しない


## 4. 変更フロー（唯一の許可手順）

境界・ports・依存ルールを変えるときは必ず以下の順で行う。

1) `manifest.yaml` を更新  
2) 実装を更新（port / rules に従う）  
3) 生成物を更新（自動生成）  
4) checks を通す（CI / ローカルで強制）

**この順序以外の変更は不許可。**


## 5. 強制（Checks：落ちるルール）

最低限、以下を「落ちる」形で維持する。

- 禁止依存（forbidden imports）
  - core / renderer は `window` / `document` を直接参照しない（DOM/環境依存の隔離）
  - 例外：`runtime/renderer/env.js` のみが window/document に触れてよい
- single-writer（UI から state 直書き禁止）
- ports 整合（越境呼び出しが ports に載っていること）
- 生成物整合（`_generated` が最新であること）

### 5.1 severity と CI の扱い（契約）

Checks は severity を持つ（manifest.yaml の checks.severity）。

- **error**: CI を失敗させる（“落ちる”）
- **warn**: CI は失敗させないが、ログに残し、修正対象として扱う
- **info**: 参考情報（任意）

CI の失敗条件は **severity=error のみ**とする（warn は許容する）。

### 5.2 recommended の扱い（非致命）

`recommended` は品質上の推奨項目であり、欠如は仕様違反ではない。  
Viewer の guard / CI では、library meta の `recommended` 欠如は **warn** として検知するが、CI を失敗させない。

## 6. 例外（Exceptions：コメント禁止）

例外はコメントで済ませず、manifest に **例外として明記**する。

- 期限（until）と撤去条件（exit criteria）を必須とする
- 例外は “増やすほど負債” とみなし、最小化を原則とする


## 7. 例外ホスト（Hosting & Exception Hosts）

この章は例外ホスト（peekBoot 等）の許容範囲を明文化し、レイヤリング破壊を防ぐ。
本章は SSOT の補助規範であり、**manifest に記載されたレイヤ規則を上書きしない**。

### 7.1 例外ホストの目的（限定）

例外ホストは **例外**として最小限に維持し、目的を以下に限定する。

- **UI を持たない最小表示**（ホーム / 埋め込み / 軽量）
- **renderer + orbit input の単機能検証**
- **検証・デバッグ用の隔離環境**（特権アクセスは明示的に隔離）

### 7.2 分類（最低 3 区分）

A. UI無し（No-UI Host）
- UI 層を import しない（`ui/` への依存禁止）
- renderer の公開 API / input の公開 API のみを使用
- hub/core への直接アクセスは禁止（public entry を経由）

B. renderer + orbit のみ（Renderer+Orbit Host）
- renderer + input（orbit）に限定
- hub/core への直接アクセスは禁止
- UI 層は禁止

C. 例外入口（Debug/Privilege Host）
- デバッグ・検証のため限定的な特権アクセスを許容
- 明示的に隔離（命名・配置・警告コメントが必須）
- UI との依存や dev 用グローバル露出は許容だが最小限

### 7.3 許可・禁止（明文化）

許可（Allowed）
- host → entry（bootstrapViewer / bootstrapViewerFromUrl）
- host → ui（UI 付与・オーバーレイ、デバッグ UI を含む）
- 例外ホストでも **ports の公開 API を優先**する

禁止（Forbidden）
- 例外ホストが ui を import するのに、UI 以外の層（hub/core/renderer）へ直接侵入
- host が hub を直接操作（UI 経由が原則）
- host が core/renderer の内部実装を直 import
- 例外ホストが DOM contract / embed contract を破る

### 7.4 例外ホスト一覧（現状）

| Path | 分類 | 想定レイヤ | 直接 import している層メモ |
|---|---|---|---|
| `/viewer/peekBoot.js` | A. UI無し | host | entry（bootstrapViewerFromUrl） |
| `/viewer/peek.html` | A. UI無し | host | peekBoot のみ |
| `/viewer/peek/index.html` | A. UI無し | host | peekBoot のみ |
| `/viewer/viewerDevHarness.js` | C. 例外入口 | host | entry（bootstrapViewerFromUrl）, ui（attachUiProfile/detailView 等） |
| `/viewer/viewer_dev.html` | C. 例外入口 | host | viewerDevHarness のみ |

### 7.5 Minimal Host allowlist（SSOT）

- 対象エントリ：`peekBoot.js`  
  - `minimalHostEntries` の key は **実ファイル名に一致**させる
- 許可 import：`runtime/bootstrapViewer.js` のみ
- 禁止 import：`ui/**`, `runtime/core/**`, `runtime/renderer/**`, `runtime/viewerHub.js` 等
- 理由：UI なしの最小ホストを entry 経由に固定し、内部実装への依存を封じる

この allowlist は `scripts/check-forbidden-imports.mjs` で静的に強制する。

### 7.6 追加時チェックリスト（例外ホストを増やす場合）

1. 命名規約：`exception` / `peek` / `dev` など意図が分かる名前
2. 配置：`/viewer/` 直下 or `/viewer/peek/` 等に隔離
3. 先頭コメント：`SSOT_EXCEPTION_HOST` + 分類 + 禁止事項を明記
4. 依存経路：ports / 公開 API を使用（内部 import 禁止）
5. manifest 追記：例外一覧（この章に準拠する形）を更新

追加ルール：
- importmap の three は `/viewer/vendor/...` 固定
- `check-host-asset-paths` を通す

### 7.7 例外ホストの先頭コメント（テンプレ）

```text
// SSOT_EXCEPTION_HOST: <分類名>
// Purpose: <目的>
// Allowed: <許可 import / 公開 API>
// Forbidden: <禁止 import>
```

## 8. 公開ミラー

この章は Viewer SSOT の運用上、公開配布形（site mirror）を含めて事故を防ぐための規範である。

- SSOT:
  - viewer: `apps/viewer/ssot/**`
  - schemas: `packages/schemas/**`
  - content: `packages/3dss-content/**`
  - vendor: `packages/vendor/**`
- Public mirror destination（唯一）: **`apps/site/public/**`**
- `sync:*` の書き込み先は **`apps/site/public/** のみ許可**（SSOT → public の単方向）
- `apps/site/dist/**` と `packages/**/dist/**` は **ビルド生成物**であり **git 管理しない**（`.gitignore` 対象）
- 目的: 「どれが最新か」を構造で確定し、生成物差分でレビューが汚染されるのを防ぐ
- apps/site/public/** は 手編集禁止（変更は SSOT を直して sync:* で反映）

## 9. バージョニング

* manifest は schema_version を持つ
* ports に breaking change がある場合は manifest 側で major を上げる

## 10. オーナーシップ

* manifest の変更は最優先レビュー対象
* 「動くけど規範とズレてる」は不合格

```
