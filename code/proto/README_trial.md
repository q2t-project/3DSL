# 3DSL P1.9 Codex Trial Prototype

**目的**  
Codexを本番導入する前に、Validator／Modeler／Viewer の最小構成を通しで生成・実行し、  
構造・依存・入出力の正確性とプロセスを検証する。

---

## 実行手順

1. Codex に `/meta/p_1_9_proto_plan.md` を添付。  
2. 同ファイル内「Codex試走ディレクティブ」節をそのまま実行。  
3. 出力は `/code/proto/` に上書きされる。
4. 結果は `/logs/runtime/proto_eval.log` に記録。  
5. `sample_valid.3dss.json`（OK）と `sample_invalid.3dss.json`（NG）をテスト入力とする。

---

## 構造

/code/proto/
validator.html
modeler.html
viewer.html
js/
proto_validator.js
proto_modeler.js
proto_viewer.js
utils.js
data/
sample_valid.3dss.json
sample_invalid.3dss.json
logs/
runtime/


---

## ブランチ情報
- Branch: `main`
- Phase: **P1.9 (Codex Trial Run)**
- Next: `P2 (正式Codex実装)`
