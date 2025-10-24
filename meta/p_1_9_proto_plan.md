# P1.9 プロト実装・評価フェーズ計画書

1. フェーズ概要

本フェーズ（P1.9）は、仕様フェーズ（P1-08 locked済）と実装フェーズ（P2 Codex実装）の橋渡しとして、
Codexを本番導入する前に、Codex自身でプロトタイプを通し生成・実行する試走を行う。

目的は次の2点である：

分類	目的
A. 成果物確認	Codexが仕様をどの程度正確に実装化できるかを“実体で”確認する。
B. プロセス検証	Codex実行プロセス（指示→生成→PR→評価→反映）の有効性と運用手順を検証する。
2. フェーズ目的・到達点
項目	内容
フェーズ種別	P1.9 – 試走（Trial Run）
到達点	Validator／Modeler／Viewer の最小構成がCodexのみで生成・実行できること。
評価観点	実装精度・依存整合・入出力往復・UI操作性・PR生成フロー。
次段階	問題なければ P2 実装フェーズを正式開放（Codex本格運用開始）。
3. 出力位置づけ
フェーズ	区分	出力物	備考
P1	仕様設計	/specs/3DSD_*.md	locked済
P1.9	試走（Codex実行）	/code/proto/	Codex出力成果
P2	実装生成	/code/*/	Codex正式実装
P3	検証	/logs/runtime/	動作・精度評価ログ
P4	改訂	/specs/*.rev*.md	仕様反映・再ロック
4. 実施手順（再構成）
ステップ	内容	担当
P1.9-01	Codex試走仕様の最終確定（統合仕様／入出力定義）	ChatGPT＋人間
P1.9-02	Codex実行試走（Validator／Modeler／Viewer最小構成）	Codex＋人間
P1.9-03	成果物確認（手動評価＋ACチェック）	人間
P1.9-04	実行プロセス検証報告書作成	ChatGPT整形＋人間承認
P1.9-05	改善項目の仕様反映／再ロック	ChatGPT＋人間
5. Codex試走スコープ
対象	実装範囲	技術要件
Validator	.3dss.json を Ajv + ajv-formats で検証し OK/NG出力	ajv@^8, ajv-formats
Modeler	Point／Line／Aux の追加・削除・保存。保存時に Validator 呼出	three.js r160+, dat.GUI
Viewer	JSONを3D描画し、points/lines/auxを表示ON/OFF	three.js, OrbitControls
共通	logging, cache, error recovery	console＋localStorage
6. Codex実行ディレクティブ（試走用）

タイトル: P1.9 Codex Trial — 3DSD Proto (Validator/Modeler/Viewer Minimal)
目的: /schemas/3DSS.schema.json に準拠した最小構成を /code/proto/ に生成し、Validator→Modeler→Viewer の往復を通す。
重要: スキーマURI固定・ESM構成・ビルド不要。

ライン別要件

Validator: ファイル選択→Ajv検証→OK/NG表示＋エラー配列。

Modeler: Add Point／Add Line／Save／Validateボタン。保存時にValidator呼出。

Viewer: JSON読み込み→points/lines描画→ON/OFFトグル。

環境条件: three.js r160+, OrbitControls, dat.GUI, ajv, ajv-formats。CDN import可。
ファイル構成:

/code/proto/{validator.html, modeler.html, viewer.html}
/code/proto/js/{proto_validator.js, proto_modeler.js, proto_viewer.js, utils.js}
/code/proto/data/{sample_valid.3dss.json, sample_invalid.3dss.json}


成果確認: AC-1〜AC-5を満たすこと（下表参照）。

7. 受入基準（Acceptance Criteria）
コード	検証内容	合格基準
AC-1	Validator：sample_valid → OK／invalid → NG	条件判定成功
AC-2	Modeler：Add Point → Save → Validator OK	出力整合
AC-3	Viewer：JSONロード → points/lines表示 → トグル操作可	表示成功
AC-4	全HTMLがブラウザ直開きで動作	サーバ不要
AC-5	/code/proto/README_trial.md に手順・確認結果を記載	ドキュメント整備
8. 評価・記録方法
評価軸	内容	記録先
構造整合	schema逸脱・Validator通過率	/logs/runtime/proto_eval.log
操作性	UI動線・操作レスポンス	/meta/proto_review.md
再利用性	P2 Codex実装への転用可否	/meta/proto_review.md
安定性	実行エラー・例外捕捉率	/logs/runtime/proto_eval.log
9. 成果反映手順

/meta/proto_review.md にCodex試走結果と改善点を記録。

必要な仕様修正を /specs/*.md に反映。

再確認後 locked_date 更新、再ロック。

/meta/update_log.md に「P1.9 Codex試走反映」追記。

10. スケジュール（試走単位）
タスク	開始	終了	担当
Codex試走準備・指令発行	10/25	10/25	ChatGPT＋人間
Codex実行・PR生成	10/26	10/27	Codex
評価・報告書	10/28	10/30	人間＋ChatGPT
仕様反映・ロック	10/31	11/01	ChatGPT＋人間
11. 改訂履歴
日付	Ver	内容	担当
2025-10-24	1.0	初版（プロト実装計画）	ChatGPT＋人間
2025-10-24	2.0	Codex試走計画として再構成（プロセス評価を主目的に統合）