---
title: "Viewer regression smoke"
summary: "Viewer の最低限の回帰スモークを、ブラウザ上で手早く回す手順。"
---

## 目的
- UI と Hub が最低限つながっていること
- 3DSS が読み込めて、操作できて、クラッシュしないこと

## 前提
- `npm --prefix apps/site run sync:all`
- `npm --prefix apps/site run dev`

## 手順
1. ブラウザで `/viewer/` を開く。
2. 任意の 3DSS を読み込む（Library からでOK）。
3. DevTools Console で下を実行:

```js
const r = await import('/viewer/docs/test/regressionRunner.js?ts=' + Date.now());
await r.runAll();
```

## 期待結果
- Console に `pass:` が出る
- 異常時は `fail:` が出る（詳細は Console / Network / stack trace を確認）
