# Legacy name cleanup

このリポジトリ内で、過去の開発段階名に由来するラベルが残って混乱しやすかったため、
「リリース前チェック」「回帰スモーク」など、役割ベースの名前に整理した。

## 方針
- npm script: `check:release` に集約（リリース前チェックの入口を 1 つにする）
- viewer smoke: `regressionRunner.js` と、それを説明する spec に統一

## 追加でやること（手動）
- 互換のために残している古いファイルがあれば削除する
  - `apps/viewer/ssot/spec/` 内の legacy smoke spec
  - `apps/viewer/ssot/docs/test/` 内の legacy runner

※ history を見れば過去名は追えるので、このファイルは役割説明だけを残す。
