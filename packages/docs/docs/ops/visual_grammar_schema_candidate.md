# 文字と色の凡例：P0監査とP2候補契約

2026-10-30 JST。HG-V1判断用、v2.0.0 **候補**。公開仕様・正式リリースではない。

本書は `visual_grammar_action_plan.md` のP0とP2の成果を記録する。追加した候補スキーマと検査は独立しており、公開・再構築Viewer/Modelerのvalidator、起動処理、保存処理、公開/latestスキーマを切り替えていない。凡例の意味と見本の判断は別のHG-V1資料で行う。

## 1 候補の場所と識別

- 候補：`packages/schemas/candidates/v2.0.0/3DSS.schema.json`
- `$id`：`https://3dsl.jp/schemas/candidates/v2.0.0/3DSS.schema.json`
- 文書の `document_meta.schema_uri`：上記URLに `#v2.0.0` を付ける。
- `document_meta.version`：候補では2.xのSemVer。見本は `2.0.0`。
- ベース：公開正本のv1.1.4。候補URIはrelease URIと区別する。配布では候補ファイルだけを専用パスへ追加し、latestとreleaseの内容を変更しない。URLの記載だけで本番公開済みとは扱わない。
- 凍結：`release/v1.1.3`、`release/v1.1.4` および現行正本を変更しない。

numberで許されていた文字サイズを有限enumへ狭めるため、新しいmajorの候補とした。既存文書のURIだけを変更すると正しい変換になるわけではない。

公開正本と再構築版は同じv1.1.4のIDだが、再構築版は線の旧root端点 `lines[].end_a/end_b` も許可する。候補はこの差を継承せず、公開正本どおり `lines[].appearance.end_a/end_b` を使う。既存読込の差を解消する実装はP3に残す。

## 2 サイズと文字属性

共通の `$defs.labels.scope_size` は次の値を許可する。

`0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256`

この範囲は、既存captionの上下限と、監査した公開モデルの0.5・1を含む全ての文字サイズを保持する。未確認の全資産や任意の外部データまで十分な範囲だとは主張しない。上限外の正当な表現が見つかった場合は範囲の再検討対象とし、切捨て・クランプしない。

| 対象 | サイズのJSONパス | 候補の扱い |
|---|---|---|
| 点文字 | `points[].appearance.marker.text.size` | 共通enum、既定8 |
| 線キャプション | `lines[].appearance.caption_text.font_size` | 共通enum、既定8 |
| 数式の外側 | `aux[].appearance.module.extension.latex.font_size` | 共通enum、新版既定8 |
| 凡例の見本 | `visual_legend[].sample.size` | 指定する場合は共通enum |

数式の現行描画側は省略時10であり、新版8は見え方を変える。旧版の省略値を読み込む経路は10を保ち、移行時にこの差を表示する。数式内部の添字・分数などの組版上の縮小率を2冪へ丸める規則ではない。

以下を点文字と線キャプションに対称に設ける。既存の `content`、`align`、`pose` の配置は維持する。captionの文言は従来どおり `signification.caption` に置く。

| 属性 | 許容値・役割 |
|---|---|
| `writing_mode` | `horizontal-tb` または `vertical-rl`。省略時は横書き |
| `font` | 空でない文字列。既存tokenや既存書体文字列を保存。省略時は `helvetiker_regular` |
| `font_weight` | 指定する場合は整数400または700 |
| `color` | `#RGB` または `#RRGGBB`。文字だけの色、既定白 |
| `pose` | 従来の固定 `front` / `up` ベクトル。書字方向とは別の属性 |

明示した `font_weight` はfont文字列内の太さ指定より優先する。省略時は対応している既存fontの太さを保持し、それもなければ400とする。schema検証中に既定値を挿入して既存のbold指定を消さない。新しい明朝tokenを受理できることと、実フォントが配布・描画できることは別である。

`right = up × front` として、横書きの文字進行は `+right`、縦書きは `-up`、縦書きで次の列へ進む向きは `-right`。画面の上下に追従しない。時間・因果の向きを自動的に意味付けする規則ではない。

geometryの寸法・マーカー半径・親scale・カメラ倍率・CSSピクセルはこのenumの対象ではない。親scaleや描画側倍率によって実効サイズが変わる経路は影響監査に記録し、P3で意味的な文字階層と全体変換を分けて扱う。候補検査はこれらを勝手に規制・変更しない。

## 3 凡例の最小契約

作品直下に任意の `visual_legend` 配列を置く。各項目は次の構造を持つ。

| 属性 | 契約 |
|---|---|
| `id` | 作品内ID。`^[a-z][a-z0-9_-]{0,63}$`、作品内で重複しない |
| `label` | 読者向け名称。既存localized_string（文字列またはja/enのオブジェクト） |
| `description` | 表現の意図と読み方。同じlocalized_string |
| `applies_to` | `point_text`、`line_caption`、`line`、`point_marker` の一つ以上、重複なし |
| `sample` | 任意の表示見本。size、writing_mode、font、font_weight、color、poseの一つ以上 |

点と線の `meta.legend_refs` はIDの配列。複数の凡例への参与を許し、重複参照を拒否する。auxのlegend_refsは今回追加しない。

`sample` は凡例に示す見本であり、style継承や自動上書きの仕組みではない。実表示は各要素のappearanceが正本である。複数参照から色を混ぜたり、最後の参照の書体を適用したりしない。対象の意味を色名・font名から逆推定しない。

構造チェック `packages/schemas/candidates/v2.0.0/legendReferences.mjs` は、schema合格後に次を検査する。

- 凡例IDの重複と参照切れ。
- 参照先が当該要素種に適用できること。点はpoint_text/point_marker、線はline_caption/line。
- labelとdescriptionの少なくとも一言語に空白でない内容があること。

これは意味の正しさ、色の識別性、見本と全要素の視覚的一致を証明するものではない。凡例と実表現の対応はHG-V1で読む。

## 4 旧版保持と移行境界

旧版を新版schemaで検証して拒否するのではなく、登録された版ごとの凍結schemaと対応する描画既定を使う必要がある。今回そのruntime切替機構は実装しない。現行bootstrapのschema URI base照合、major整合、Modelerの保存前検証はP3の変更対象である。

候補内の `fixtures/legacy_permitted_sizes.3dss.json` は13/6/10を記録する旧版文書。旧版検証では合格し値を変えず、URIだけ新版へ付け替えたものは不合格になる。v1.1.3の契約でも別途旧許容を確認する。

移行時は原本とUUID・接続を保った別候補を作り、変更元JSONパス、原値、上下の2冪候補、作者が選んだ値と理由を記録する。上下候補は自動丸めの指示ではない。特に食事モデルの全点13→16だけではスコープ設計が済んだことにならない。

## 5 P0監査の範囲

機械読取結果は候補配下の `audit/source-inventory.json` と `audit/impact-inventory.json` に置く。前者は未適合サイズの全JSONパスと値、上下候補、schema IDと内容hashを記録する。適合サイズはファイル別の件数・範囲・値別集計へまとめる。後者はvalidator、初期テンプレート、入力、保存、変換器、描画・scale経路を記録する。

監査JSONは軽量化のため、適合6,354件の個別JSONパスを省略し、未適合1,125件の全パス・原値・上下候補を保持した。例外レコードで共通する判定フラグと処理方針は `migration_candidate_defaults` へ集約し、元の例外情報を完全に復元できることを確認した。元ファイルのhashと全例外パスを再照合し、約1.31MBから263,076bytesへ縮小した。適合値の位置が必要な場合は、記録したhashに一致する原本から再集計する。

拡張した監査は61ファイル、明示サイズ7,479件。JSON Pointerと原本SHA-256を照合した。非2冪1,125件の内訳は、再構築scene404件、work内のscene/baselineScene720件、旧版valid fixtureの14が1件。workには同一作品の保存本体と基準状態が含まれるため、これを別々の作品数とは数えない。旧fixtureは互換性の証拠として保持し、作品の移行対象から分ける。監査範囲に0.125〜256の範囲外はなかった。

公開Library元データ9作品の点文字1,148件、font_size2,049件は全て2冪だった。再構築版models5ファイルのうち3ファイルに非2冪があり、食事モデル44件とknowledge_questionsのbaseline/edited各180件を検出した。詳細な分類と件数は監査JSONを参照する。意図的にinvalidなfixturesを「修正すべき作品」の数へ含めない。

P3で特に注意するのは、Modelerの旧schemaベースのimportNormalizeが未知属性を削除し、extrasへ退避してもexportへ戻さないこと、およびrootの許可リストがvisual_legendを含まないこと。候補文書を現行Modelerへ通して無損失の保存を確認したとは扱わない。初期テンプレート、入力UI、正規化、保存前検証とexportを一緒に対応させる。

また、確認したViewer経路ではmarker.common.scaleはmarkerのrootへ適用され、文字ラベルは別groupで位置だけを参照するため、文字サイズの直接の迂回ではなかった。一方、labelRuntimeにはmicroFXの1.12/1.04/0.98倍と、任意のcameraScaleやmin/maxHeightがあり、作者のスコープサイズとの役割分担をP3で確認する。

生成物のpublic/dist、vendor、実行環境に存在しないPremium原本は全資産監査の対象として数えない。公開Libraryの結果だけでPremium・外部持込・過去原本も適合しているとは扱わない。

## 6 検査と実施結果

実行：`node apps/site/scripts/check/visual-grammar-schema.mjs`

追加見本の検証：同コマンドの第1引数にcandidate形式のJSONファイルを渡す。

- 候補の許容値、上下限、非2冪、0・負数・文字列・null、属性の不適合を確認。
- 点・線で書字方向、font、太さ、文字色を受理・保持し、不明属性を落とさず拒否。
- 凡例の参照切れ、ID重複、要素種不一致、空の名称を検出。
- schemaの検証自体が値の補完・丸め・削除をしないことを確認。
- 新属性のJSON serialize/parse保持を確認。ModelerのSave/Openが実装済みという主張ではない。
- 旧版v1.1.3/v1.1.4を独立に検証。実際の再構築Modeler validatorで既存canonical/regressionのvalid11件・invalid14件の結果を維持。
- 公開正本が凍結v1.1.4と一致することを確認。候補による現行schemaの書換えがない。

231検査が合格（2026-10-30）。これは候補契約と旧版回帰の結果であり、描画、実機の読解、フォント配布、Modeler編集保存、新旧版切替は含まない。

HG-V1ではこの契約を使った小さな見本と凡例の意味を評価する。P3のruntimeへの適用、P4の食事モデル全体移行、本番昇格は判断後の工程である。
