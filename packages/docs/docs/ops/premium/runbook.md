# Premium 運用マニュアル（SSOT）

本書は **3DSL Premium（/premium）運用の唯一の正本（SSOT）** とする。  
実装・運用・更新・障害対応は、必ず本書に従うこと。

---

## 1. 目的

- 有料コンテンツ（premium）を **public 体験から完全に分離**したまま提供する
- token ローテ／note 更新／Cloudflare 側更新に起因する **運用事故（リンク切れ・拡散・購買者クレーム）**を潰す

---

## 2. 絶対原則

- public（library / viewer / site）は **premium の存在を前提にしない**
- premium は **premium 配下だけで完結**させる（依存逆流禁止）
- 迷ったら「public に影響が出ない方」を選ぶ

---

## 3. 構成（ルートと責務）

### 3.1 ルート

- 概要（購入者ハブ、常時有効）
  - `/premium/<slug>`

- Premium API（静的配信）
  - `/api/premium/model/<slug>`
  - `/api/premium/meta/<slug>`

- Premium Viewer（iframe）
  - `/viewer_app_premium/index.html?model=<slug>`

### 3.2 責務

- `/premium/<slug>`：購入者の「避難所」。**壊れたら運用が終わる**
- Functions（token検証）：門番（個人情報や購入者管理はしない）
- note：購入者案内の主戦場（リンク更新・周知）

---

## 4. Premium データ（slug）追加手順

### 4.1 SSOT（原本）

```
packages/3dss-content/premium/<slug>/
  ├─ model
  ├─ meta
  └─ README.md（任意）
```

### 4.2 反映（site 側へ）

```
npm --prefix apps/site run sync:premium
npm --prefix apps/site run build
```

### 4.3 出力（期待）

- `apps/site/public/api/premium/model/<slug>`
- `apps/site/public/api/premium/meta/<slug>`

NOTE: premium の API 出力は **拡張子なし**のみに固定する（.json を本番から完全排除）。

---

## 5. Token 運用（最重要）

### 5.1 方針

- token の正本は **サーバ側（Functions / 環境変数等）**にのみ置く
- token はクライアントに埋め込まない
- ローテ事故防止のため **同時に有効な token は最大2本**
  - `active`（現行）
  - `grace`（直近の猶予）

### 5.2 ローテ手順（標準）

1. 新 token を発行（次の `active`）
2. Functions 側に **active + grace（2本）** を登録
3. note 記事を更新（新 token を案内）
4. 猶予期間（例：7日）を経過
5. 旧 token を Functions から削除（`grace` → revoke）

### 5.3 DoD（token）

- token変更中でも `/premium/<slug>`（概要）は壊れない
- tokenが無効でも「概要ページへ戻す」導線が必ずある

---

## 6. note 更新（SSOT）

### 6.1 note に必ず書くこと

- 概要ページ（常時有効）
  - `https://3dsl.jp/premium/<slug>`
- 完全版アクセス（token付き）
  - `https://3dsl.jp/premium/<slug>?token=XXXX`
- 「リンクが無効な場合は概要ページを確認」の案内

### 6.2 禁止

- `/api/premium/*` 直リンク
- `/viewer_app_premium/*` 直リンク（概要ページを経由させる）

---

## 7. 事故時の対処（ロールバック）

### 7.1 token 更新ミス

- Functions 側を「前の active/grace」に戻す → 再デプロイ
- note は触らなくてよい（必要なら後から整合）

### 7.2 note 更新ミス（リンク壊し）

- `/premium/<slug>` に誘導 → note を静かに修正
- token は原則そのまま

### 7.3 Functions 停止・障害

- 最悪でも `/premium/<slug>` は静的で生存させる
- ここに「復旧中」案内を載せて回収する

---

## 8. 変更禁止事項（破ったら運用事故）

- public viewer / library から premium API を参照する
- library に premium 前提のUIを入れる
- sitemap に premium を載せる（方針がある場合のみ例外）

---

## 9. 関連ドキュメント

- Library 登録（SSOT）
  - `docs/library/workflow`
  - `docs/library/registration`（運用チェックの薄いラッパ）
