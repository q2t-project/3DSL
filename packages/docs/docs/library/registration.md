# Library 登録チェック（premium運用との接点）

本書は **Library 登録のSSOT（正本）を補助するチェックリスト**である。  
登録手順の正本は以下：

- [Library ワークフロー（SSOT）](./workflow)

---

## 1. 目的

- Library 登録作業が premium 運用に悪影響を与えないことを確認する
- premium 導入で **public 体験を1ミリも悪化させない**ことを担保する

---

## 2. 登録前チェック（public）

- `npm --prefix apps/site run build` が通る
- `/library` 一覧・詳細が期待通り生成される
- public viewer の起動が退行していない

---

## 3. premium と交差する場合（slug追加時）

premium を追加・更新する場合は、次を実施：

- Premium データは SSOT に追加
  - `packages/3dss-content/premium/<slug>/`
- 反映
  - `npm --prefix apps/site run sync:premium`

※ public 側（library item など）から premium API を参照しないこと。

---

## 4. note更新が必要な場合

premium の購買導線（note）を変更する場合は、運用正本に従う：

- [Premium 運用マニュアル（SSOT）](../ops/premium/runbook)

---

## 5. 事故防止の原則（再掲）

- premium は premium だけで完結（依存逆流禁止）
- `/premium/<slug>`（概要）が避難所（壊さない）
