---
title: npm audit の扱い
---

## 結論

* **運用上の基準**は `apps/site` で `npm audit --omit=dev` を通す（runtime依存の監視）。
* `npm audit`（dev も含む）は、**開発ツールチェーン（language server など）**の脆弱性も拾う。これは **本番配布物（siteビルド結果）に含まれへん**ことが多いので、優先度を分けて扱う。

## 背景

現状 `npm audit` で出る `lodash` の指摘は、`@astrojs/check` → language server 系の依存（yaml/volar）経由で入ってくるケースがある。

## コマンド

* **runtimeのみ**（推奨）

```bash
npm --prefix apps/site run audit:prod
# または
bash scripts/check/site-npm-audit.sh
```

* **全部込み**（参考）

```bash
npm --prefix apps/site run audit:all
```

## 対応方針

* runtime 側に影響が出る脆弱性は最優先で潰す。
* dev-only で、かつビルド成果物に入らへんものは、
  * upstream 更新で自然に解消するのを待つ（定期的に再確認）
  * もしくは、必要性が薄いツールなら依存自体を外す

