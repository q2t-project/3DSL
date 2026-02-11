# SSOT: Premium Content & Viewer Policy

## 0. 本ドキュメントの位置づけ

本ドキュメントは、3DSL プロジェクトにおける **premium コンテンツおよび premium viewer 機構**に関する
設計思想・構造原則・運用ルールを定義する **Single Source of Truth (SSOT)** である。

本ドキュメントに反する実装・暫定対応・例外運用は認められない。

---

## 1. Premium の思想的定義

### 1.1 library との役割分離

- `library/`
  - 公開・フリーアクセス
  - SEO 主戦場
  - 安定・軽量・閲覧特化

- `premium/`
  - 購入者・信頼ユーザ向け
  - 実験的・高負荷・拡張機能を許容
  - 価値体験を最大化する空間

premium は library の「上位版」ではない。
**premium は 3DSL の思想・構造を“使う側”に入るための内側の工房である。**

---

## 2. URL 設計とアクセス制御

### 2.1 正規 URL（SEO / 説明用）

```
/premium/<slug>
```

- 検索エンジンに対する正規 URL
- token を含まない
- canonical は必ずこの URL を指す

#### token 無しアクセス時の挙動

- コンテンツ概要の表示
- premium で提供される追加価値の説明
- note 有料記事への導線

---

### 2.2 入場 URL（購入者専用）

```
/premium/<slug>?t=<TOKEN>
```

- note 有料記事内でのみ配布される
- TOKEN は入場券であり、住所ではない
- TOKEN 検証成功時のみ完全版 premium 表示

TOKEN は定期または不定期にローテーション可能とする。

---

### 2.3 SEO に関する原則（必須）

- token 付き URL をインデックスさせない
- canonical は常に token 無し URL
- sitemap に token URL を含めない

> **原則**: token は鍵であり、URL は住所である。

---

## 3. premium の可視性と導線

- サイト内ナビゲーション・カード一覧から premium への直接リンクは置かない
- 公的な Web 上の導線は、原則として note 記事内リンクのみ
- 完全秘匿を目的としないが、発見困難化を行う

---

## 4. Viewer アーキテクチャ方針

### 4.1 構造分離の原則

```
viewer-core      // 絶対 SSOT
viewer-public    // library 用構成
viewer-premium   // premium 用構成
```

- viewer-core は public / premium の存在を知らない
- core は capability / addon slot のみを提供する
- public / premium は core に addon を注入して構成する

### 4.2 禁止事項

- `if (isPremium)` 等のモード分岐
- viewer-core への premium 仕様の侵入

---

## 5. premium で許容される機能

以下は premium において許容される代表例であり、public への還元義務はない。

- 動画出力（WebM / MP4）
- 高解像度キャプチャ
- 実験的 UI
- 内部情報・デバッグ HUD
- 一時的編集・注釈（保存不可）

---

## 6. 濫用対策と利用規約

### 6.1 技術的対策（最低限）

- rate limit
- 同時実行数制限
- 長時間処理のキャンセル機構

### 6.2 規約的対策

- 学習・研究・個人利用目的を前提とする
- 再配布・商用利用は禁止（別途許諾が必要）
- 過度な自動実行・連続実行は禁止

premium は「規約が読まれる空間」であることを前提とする。

---

## 7. 広告ポリシー

- `library/`: 広告掲載を許可
- `premium/`: 原則として広告を掲載しない

premium は静かな価値体験空間とする。

---

## 8. 本 SSOT の変更ルール

- 本ドキュメントの変更は、premium / viewer 構造全体への影響を伴う
- 変更時は必ず差分理由と影響範囲を明示すること
- premium 実装の方針・仕様に変更があった場合は、**追記（Appendix 追加）**の形で記録を残すこと

---

## Appendix A. 実装影響範囲（P0-1 確定）

本 Appendix は、premium 実装を開始する前提として確定した **影響範囲（触る／触らない／分離）** を記録する。

### A.1 premium 実装で「触る」（変更対象）

- site routing（`/premium/*`）
  - 新規ルートは `apps/site/src/pages/premium/` 配下に構築し、`library/` と並列運用する
- premium 用ページコンポーネント
  - premium 固有の UI / ロジックは `apps/site/src/pages/premium/**` に閉じる
  - 共有部品が必要な場合のみ `apps/site/src/components/` などの既存共有領域を利用する
- viewer の生成入口（capability 注入ポイント）
  - 注入点は viewer の組み立て（hub / bootstrap）側に寄せ、viewer-core へ premium 概念を侵入させない
- CF 側 gate（token 検証）
  - token 検証は gate レイヤに限定し、viewer は token を知らない

### A.2 premium 実装で「触らない（不変）」

- **viewer-core**
- **3dss schema / canonical validation**
- **library 一覧生成ロジック**
- **sitemap 生成の既存ルール（premium は除外）**

### A.3 premium と物理的に分離する

- library 配下のコンテンツ
- library 用 viewer 設定

---

## Appendix B. 責務分解（P0-2 確定）

本 Appendix は、`/premium/*` を実装する前提として確定した **レイヤ責務（SEO/概要・gate・表示）** を記録する。

### B.1 レイヤ一覧（役割と責務）

1) **SEO / 概要レイヤ（住所）**

- 対象 URL: `/premium/<slug>`
- 常に 200 を返す（404 にしない）
- 内容: 概要、premium 価値説明、note への導線
- SEO: canonical は常に `/premium/<slug>`（token 無し）

2) **gate レイヤ（鍵）**

- 対象 URL: `/premium/<slug>?t=<TOKEN>`（および cookie 方式の再訪問）
- 役割: token/cookie の検証と権限状態の確定
- 表示はしない（viewer を知らない）
- 失敗時: 403/404 で終わらせず、概要レイヤへ誘導する

3) **表示レイヤ（viewer）**

- 役割: capability/addon を与えられた viewer を表示するだけ
- 禁止: token / note / premium 判定ロジックを持たない
- premium 差分は capability/addon により注入する（`if (isPremium)` は禁止）

### B.2 gate の実装配置

gate は Cloudflare edge で実装し、server-side で token を検証する。
repo では **Pages Functions** を採用し、次の配置を正とする。

`apps/site/functions/**`

### B.3 共有の境界（逆流防止）

- gate は viewer を import しない（viewer に依存しない）
- viewer は gate を import しない（token/cookie を知らない）
- `/premium/<slug>` は概要と導線を提供するが、権限確定は gate の責務とする

---

## Appendix C. viewer 差分注入点（P0-3 確定）

本 Appendix は、premium 差分（capability / addon）を **viewer-core へ侵入させず**に注入するための
**注入点（どこで受け取り、どこで適用するか）** を確定する。

### C.1 入口（Host → runtime）

capability / addon は、Host（site / harness）から **runtime の公開 API** に渡す。
具体的な入口は次のいずれかであり、premium 実装は原則として `bootstrapViewerFromUrl` を用いる。

- `apps/viewer/ssot/runtime/bootstrapViewer.js`
  - `bootstrapViewerFromUrl(canvasOrId, url, options?)`
  - `bootstrapViewer(canvasOrId, document3dss, options?)`

Host 側で渡す `options` に、premium 差分を表すフィールドを追加する（名称は P4 で確定するが、位置はここで固定）。

### C.2 注入点（composition root）

viewer の composition root は `bootstrapViewer` であり、次の箇所を premium 差分の注入点として固定する。

- `apps/viewer/ssot/runtime/bootstrapViewer.js`
  - `const core = { ... }` を組み立てる区間
  - `const hub = createViewerHub({ core, renderer });` の直前

**原則**:

- capability / addon は `options` で受け取り、composition root で `core` / `hub` に引き渡す
- `viewer-core`（`apps/viewer/ssot/runtime/core/**`）には premium 概念を追加しない
- `if (isPremium)` 等のモード分岐を core に持ち込まない

### C.3 適用点（hub / addon mount）

capability の解釈と addon の mount は、core ではなく **hub 側**に閉じる。
適用点は次のいずれかに限定する（P4 で実装方式を確定）。

- `apps/viewer/ssot/runtime/viewerHub.js`
  - `createViewerHub({ core, renderer, ... })` の初期化処理
  - `hub.start()` 相当の起動処理（存在する場合）

### C.4 Host 実装の参照点（既存）

既存 Host は次に存在する。premium 側はこれらを“改造”するのではなく、必要なら **別 Host（site 側）**から
`bootstrapViewerFromUrl` に `options` を渡して差分を注入する。

- `apps/viewer/ssot/viewerHost.js`（汎用 Host）
- `apps/viewer/ssot/viewerDevHarness.js`（開発 harness）

---

以上

## Appendix D. Token 運用ポリシー（P0-4 確定）

本 Appendix は、premium のアクセス制御（token / cookie）に関する運用方針を確定する。

### D.1 基本方針（SEO と運用事故の回避）

- **住所（正規URL）は固定**: `/premium/<slug>`（token 無し）
- token は **鍵**（入場券）であり、SEO の世界へ露出させない
- token 不一致・失効時は 403/404 を返さず、**概要ページ（token無し表示）へフォールバック**する

### D.2 推奨方式（初回 token → cookie セッション）

- note 内リンクは `/premium/<slug>?t=<TOKEN>` を配布
- token 検証に成功した場合、サーバ側（gate）で **cookie セッション（通行証）**を発行する
- 以降は token なしの `/premium/<slug>` でも、cookie が有効な限り **完全版**へ到達できる
- cookie 失効時は、概要ページへ戻し、必要なら note 導線を再提示する

> 目的: 購入者のブックマーク利便性を確保しつつ、token ローテによるリンク切れ事故を減らす。

### D.3 Token ローテーション

- 運用上、token は定期・不定期にローテーション可能
- ローテ時は原則として **現行 token + 直近 token** の 2 本を一定期間許可し、購入者体験の断絶を避ける
- 緊急停止（漏洩等）時は、直近 token の許可期間を短縮・無効化できる

### D.4 実装・保存場所（gate 層に限定）

- token の検証・管理は **gate レイヤに限定**し、viewer へ流入させない
- token の保存は、環境変数・KV・D1 等の **サーバ側ストレージ**で行う（クライアントへ正本を埋め込まない）
- 連続試行に備え、最低限の rate limit / 同時実行制限を gate で行う（詳細は Appendix の追加で記録する）

---

## Appendix E. P1 以降の実装順序の凍結（P0-5 確定）

本 Appendix は、premium 実装における **作業順序（触る順）** を凍結し、手戻りの原因となる「ついで実装」を禁止する。

### E.1 実装フェーズの凍結（P1〜P3 でやること）

- **P1: /premium/<slug>（固定URL）を成立させる**
  - token 無しで 200（概要表示）を返す
  - canonical は token 無し URL を指す
  - premium はサイト内ナビ／一覧から直接リンクしない

- **P2: gate（token 検証）を成立させる**
  - `/premium/<slug>?t=<TOKEN>` の検証
  - token OK →（cookie 発行の上で）完全版へ到達可能
  - token NG/失効 → 403/404 ではなく概要へフォールバック
  - token 付き URL は noindex + canonical は token 無し

- **P3: 完全版ページの“器”だけを用意する**
  - 完全版レイアウトと premium パネル枠（空で可）
  - Viewer は既存表示を流用（差分注入は P4 以降）

### E.2 P1〜P3 で「絶対にやらない」こと（禁止）

- 動画出力・高解像度キャプチャ等の価値機能（P5 以降）
- viewer-core への変更（常に禁止）
- capability/addon の本格導入（P4 以降）
- library 側の UI/導線/生成ロジックの改変（本 SSOT の不変領域）
- premium の一覧公開・sitemap 掲載（premium は除外）

### E.3 追加要望の扱い

- P1〜P3 の期間に発生した追加要望は「TODO」として記録し、**P4 以降の Appendix 追記**で扱う
- 「ついでにここも直す」は禁止し、必ずフェーズ切りして差分を分離する

---

## Appendix G. Gate 実装の置き場所（P2-1 確定）

P2 の gate（token 検証・cookie 発行）は Cloudflare Pages Functions で実装する。
本 repo では site のプロジェクトルートを `apps/site/` とし、Functions は以下に配置する。

- Functions ルート: `apps/site/functions/`
- premium gate ルーティング（動的）: `apps/site/functions/premium/[slug].ts`

これにより `/premium/<slug>` へのアクセスは、静的生成に依存せず gate 層で受け止められる（P1 の未達を P2 で解消）。

---

## Appendix H. Gate レスポンス方針（P2-2 確定: 常に 200）

`GET /premium/<slug>(?t=...)` は Pages Functions（gate）で受け、原則として **常に 200** を返す。
（漏洩・攻撃対応の 403/404 は、必要になった時に別 Appendix 追記で導入する。）

### H.1 分岐（1レイヤに閉じる）

- token 無し & cookie 無し → 概要HTML（200）
- token OK → cookie 発行 + 完全版HTML（200）
- token NG → 概要HTML（200）＋ログ（200）

### H.2 P1 未達の解消

静的生成に依存せず、`/premium/<slug>` を gate が直接受け止めることで、任意 slug に対して 200 を返す。

---

## Appendix I. SEO ヘッダ付与（P2-3 確定: token 露出防止）

Pages Functions（gate）が返すレスポンスで、token 付き URL のインデックス化を防ぐ。

### I.1 付与ルール

- token 付き（`?t=` あり）アクセスで返す **完全版/概要の両方**:
  - `noindex` を付与（`X-Robots-Tag: noindex`）
  - 併せて HTML `<head>` に `<meta name="robots" content="noindex">` を入れて冗長化する
  - canonical は常に token 無し: `https://3dsl.jp/premium/<slug>`
- token 無し（正規URL）アクセス:
  - canonical は `https://3dsl.jp/premium/<slug>`
  - `noindex` は付けない（SEO 可）

### I.2 DoD

- `?t=` の時だけ `noindex` が確実に付く
- canonical は常に token 無し URL

---

## Appendix J. Token 検証と cookie 発行（P2-4 最小実装）

### J.1 Token の正本（クライアントへ埋め込まない）

初期実装では、token はサーバ側（Pages Functions の env）にのみ保持する。次のいずれかを利用できる。

- `PREMIUM_TOKENS_JSON`: `{"<slug>":["tok1","tok2"],"*":["tokAny"]}`
- `PREMIUM_TOKEN_ANY`: `tok1,tok2`（全slug共通のフォールバック）
- `PREMIUM_TOKEN_<SLUG>`: `tok1,tok2`（slugごとの上書き。`<SLUG>` は大文字・記号は `_` に正規化）

### J.2 Cookie（通行証）

- name: `premium_pass`
- value: `slug.exp.sig`
  - `sig = HMAC-SHA256(secret, "slug.exp")`
- attributes: `HttpOnly; Secure; SameSite=Lax; Path=/premium/`
- 有効期限: 7日（Max-Age）

### J.3 DoD

- token OK → cookie がセットされる
- 次回 `/premium/<slug>`（token無し）でも完全版になる
- token NG → cookie は出ない／概要へ戻る（常に200）

---

## Appendix K. Functions 内テンプレ（P2-5 最小）

P3 で完全版の“器”を本格化するまで、P2 では Pages Functions 側で **超ミニマムな HTML** を返す。

- 概要: タイトル／説明／note 導線（仮URL）
- 完全版: タイトル／「完全版（仮）」表示（Viewer は載せない）
- 外部 JS/CSS 依存は持たない（インライン最小）
- 広告は載せない

---

## Appendix L. Gate ログ（P2-6 最小）

gate（Pages Functions）は、token の可否を最小ログとして出力する。個人情報は含めない。

- `result=token_ok | token_ng`
- `slug=<slug>`
- `ray=<cf-ray>`

DoD: token NG の試行が追える。

---

