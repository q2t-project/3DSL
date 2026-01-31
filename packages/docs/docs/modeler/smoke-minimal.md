# M2 A2: Minimal smoke verification (selection/focus)

目的：M2のA1で固定した「Selection / Focus Contract」が、最低限の入力ケースで壊れていないことを機械的に確認する。

## どこを検証するか（最小）

ブラウザ無しで、Selection / Focus Contract の入口が最低限壊れていないことだけを確認する。

- QuickCheck issue（uuid無し、path有り）から uuid を解決できる
- 解決した uuid に対して selection がセットされ、focus が呼ばれる
- kind/path の推論が動く（/points|/lines|/aux）
- Preview pick（単一 / ctrl|cmd toggle）で selection が期待通り更新される
- Outliner（単一 / shift range）で selection が期待通り更新される
- 未適用dirtyガードが deny を返した場合、selection が変わらない

## 実行方法
```bash
npm --prefix apps/modeler run smoke
# (direct) node apps/modeler/ssot/scripts/smoke/minimal-selection.mjs
```

成功時：exit code 0 + "SMOKE OK" を出す。失敗時：例外 or exit code 1。

## 注意
- これはUIのDOM操作やiframe越しのpostMessageまでは見ない（M2のA2は“契約の核”だけを守る）。
- M2のA2が安定したら、A3でブラウザE2E（Playwright等）を検討する。