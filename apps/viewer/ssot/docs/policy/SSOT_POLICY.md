# Viewer SSOT Policy (meta)

## 0. 目的
Viewer の設計・実装・運用における「正（truth）」を 1 箇所に固定し、
規範の二重化・死に規範化・後付け正当化による越境を防ぐ。

## 1. SSOT（Single Source of Truth）
- Viewer の SSOT root は **`/viewer/manifest.yaml`** とする。
- 境界（ports）・レイヤ依存・起動点・生成物・検査（checks）の最終決定は manifest に集約する。
- manifest に書かれていないルールは「運用メモ」であり、規範としては扱わない。

### 1.1 SSOT のスコープ（A方針）
- manifest は **境界と統治に特化**する（ports / layers / dependency_rules / checks / generated）。
- 詳細仕様本文（長文の説明・設計意図・例・アルゴリズム解説）は Human Spec に置き、manifest から参照する。

## 2. 成果物の分類
### 2.1 SSOT（機械可読・運用の真実）
- `/viewer/manifest.yaml`
  - layers / dependency_rules
  - ports（越境口）
  - entrypoints（bootstrap 等）
  - checks（強制ルール）
  - generated（生成物の定義）

### 2.2 Human Spec（人間向け規範）
- 例：`/viewer/3DSD-viewer.md`、`/viewer/viewer_dom_contract.md`、`/viewer/spec/*.md`
- **manifest から参照されているものだけ**を「正の一次資料」として扱う。
- 参照されていない spec は deprecated（廃棄候補）とする。

### 2.3 Generated Artifacts（生成物）
- 例：`/viewer/_generated/PORTS.md`
- 生成物は **手編集禁止**。
- 差分が出たら generator か manifest を直す。

### 2.4 置き場の固定
- 生成物は **`/viewer/_generated/`** 配下に固定（手編集禁止）。

## 3. Port の定義
- Port は「**レイヤ境界を跨いで呼んでよい公開口**」を指す。
- 同一レイヤ内の export は internal API であり、port ではない。
- port は最低限、以下を持つ：
  - caller layer / callee layer
  - surface（関数・イベント・オブジェクト形状）
  - stability（stable/experimental/deprecated）

### 3.1 Port のスコープ（Viewer）
Viewer の ports 一覧に含めるのは、次の越境口のみに限定する。

- **host -> entry**
- **ui -> hub**
- **hub -> core**
- **hub -> renderer**

補足：
- **entry -> core / entry -> renderer** は「内部結線（composition root）」であり ports には含めない（別枠）。
- **host は hub を直接操作しない**。hub の操作は ui（＝ハーネス/インタラクション層）経由に統一する。

### 3.2 deprecated/compat の扱い
- 互換ラッパ（compat）は **ports に含めない**。
- compat は manifest の `deprecated.compat` に明記し、撤去期限（until）と撤去条件（exit criteria）を持たせる。
- 新規実装は compat に依存しない。

## 4. 変更フロー（唯一の許可手順）
境界・ports・依存ルールを変えるときは必ず以下の順で行う：
1) `manifest.yaml` を更新
2) 実装を更新（port に従う）
3) 生成物を更新（自動生成）
4) checks を通す（CI/ローカルで強制）

この順序以外の変更は不許可。

## 5. 強制（Checks）
最低限、以下を「落ちる」形で維持する：
- 禁止依存（forbidden imports）
  - core/renderer は `window`/`document` を直接参照しない（DOM/環境依存の隔離）
  - 例外: `runtime/renderer/env.js` のみが window/document に触れてよい
- single-writer（UI から state 直書き禁止）
- ports 整合（越境呼び出しが ports に載っていること）
- 生成物整合（_generated が最新であること）

## 6. 例外（Exception）
例外はコメントで済ませず、manifest に **例外として明記**する。
- 期限（until）と撤去条件（exit criteria）を必須とする。

## 7. バージョニング
- manifest は schema_version を持つ。
- ports に breaking change がある場合は manifest 側で major を上げる。

## 8. オーナーシップ
- manifest の変更は最優先レビュー対象。
- 「動くけど規範とズレてる」は不合格とする。
