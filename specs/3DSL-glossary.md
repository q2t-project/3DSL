================================
3DSL-glossary.md（用語集）
================================

# 0 目的と適用範囲

## 0.1 目的

3DSL-glossary（以下、本書）は、3DSL プロジェクトにおける用語を整理し、

- JSON スキーマ（3DSS.schema.json）
- アプリ仕様書（3DSD-common / 3DSD-modeler / 3DSD-viewer）
- Codex 実装指示（AGENTS.md など）

の間で意味・表記ゆれが生じないようにするための用語集である。

3DSL 内で頻出する概念・スキーマ上のキー名・アプリ名などを対象とし、

- 日本語名称
- 英語名称
- スキーマ上のキー（該当する場合）
- 所属カテゴリ（データ構造／UI／ファイル形式／運用など）
- 定義と補足

を整理する。

## 0.2 対象範囲

本書が扱うのは、以下のレイヤの用語である。

- データ構造（3DSS：lines / points / aux / document_meta など）
- 見え方・座標系・フレーム（appearance / frames / Z+ など）
- アプリケーション（modeler / viewer / common）
- ファイル・スキーマ（.3dss.json / .3dss-prep.json など）
- 開発プロセス・Codex 運用（仕様駆動開発・AGENTS など）

アルゴリズムや内部実装固有の変数名などは原則として対象外とし、
スキーマ・仕様書・Codex 指示に共通で登場する用語に絞る。

---

# 1 基本概念（プロジェクト全体）

## 1.1 プロジェクトとスキーマ

| 用語            | 英語表記                               | スキーマキー        | カテゴリ       | 定義・説明 |
|-----------------|----------------------------------------|---------------------|----------------|-----------|
| 3DSL            | Three-Dimensional Structural Language | -                   | プロジェクト   | 三次元空間を用いて「構造」を記述・共有するための、全体的な言語・フレームワークの総称。3DSS スキーマ・modeler・viewer・common などの要素を含む。 |
| 3DSS            | Three-Dimensional Structural Schema   | ルートオブジェクト | スキーマ       | 3DSL における構造データの JSON 標準スキーマ。`lines` / `points` / `aux` / `document_meta` の 4 大要素を持つ。 |
| 3DSD            | Three-Dimensional Structural Desktop / Data（慣用略） | - | アプリ群 | 3DSS データを扱うアプリケーション群の総称。生成アプリ（modeler）と閲覧アプリ（viewer）が中核を成す。 |
| common          | 3DSD-common                          | -                   | 共通仕様       | modeler / viewer が共有すべき基礎仕様を定めた文書および概念。座標系・色規範・frames の意味論などを含む。 |
| modeler         | 3DSD-modeler                         | -                   | アプリ         | 3DSS 構造データの生成・編集・保存を行う唯一の「構造生成アプリ」。`.3dss.json` の正規出力源となる。 |
| viewer          | 3DSD-viewer                          | -                   | アプリ         | `.3dss.json` を読み取り、三次元構造の閲覧・確認・体験のみを行う read-only ビューワ。構造データを書き換えない。 |
| Authoring Layer | Authoring Layer                      | -                   | アーキテクチャ | LLM 等を含む「構造コンテンツの生成（著述）」側のレイヤ。modeler / viewer の手前段階で、name や関係の候補を生成する。 |
| Structural Layer| Structural Layer                     | -                   | アーキテクチャ | 3DSS 構造データおよびその編集・閲覧（modeler / viewer）を担うレイヤ。3DSL の中核部分。 |

## 1.2 開発プロセス・運用

| 用語                       | 英語表記                          | スキーマキー | カテゴリ   | 定義・説明 |
|----------------------------|-----------------------------------|--------------|------------|-----------|
| 仕様中心主義               | Spec-centric Development         | -            | 開発プロセス | スキーマ・仕様書を中心ストレージ（GitHub）として扱い、「仕様 → 実装（Codex） → ログ → 仕様フィードバック」のループで開発する方針。 |
| 仕様駆動開発プロセス       | 3DSL Spec-driven Dev Process     | -            | 開発プロセス | `/specs/3DSL_仕様駆動開発プロセス.md` に記載された、3DSL における開発手順の全体像。 |
| Codex                     | Codex                             | -            | 実装エージェント | 仕様からコードを生成・修正する自動実装エージェント。ChatGPT とは役割を分離し、AGENTS によって制御される。 |
| AGENTS                   | AGENTS                            | -            | 運用定義   | Human / ChatGPT / Codex の役割分担・責務範囲・実行フローを定義したメタ仕様。`AGENTS.md` として管理する。 |
| runtime ログ              | runtime logs                      | -            | ログ       | アプリ実行時のパフォーマンスやエラー・バリデーション結果などを記録するログ。Codex へのフィードバック材料となる。 |
| codex ログ                | codex logs                        | -            | ログ       | Codex によるコード生成・変更履歴・検証結果などを記録するログ。仕様との整合性を確認するために利用する。 |

---

# 2 データ構造（3DSS）

## 2.1 トップレベル構造

| 用語           | 英語表記    | スキーマキー    | カテゴリ       | 定義・説明 |
|----------------|-------------|-----------------|----------------|-----------|
| lines          | lines       | `lines`         | 構造要素       | 「関係要素」。2 点以上の points を結び、何らかの関係（構造・論理・時間・意味）を表す線分・パス。 |
| points         | points      | `points`        | 構造要素       | 「存在要素」。空間上の点として配置される構造単位。オブジェクト・概念・場所などを表す。 |
| aux            | aux         | `aux`           | 補助要素       | 「補助要素」。grid / axis / plate / shell / HUD など、構造理解や可視化を支援する要素群。 |
| document_meta  | document meta| `document_meta`| 管理情報       | 構造データ全体に関するメタ情報（タイトル・作者・バージョン・更新日時など）を保持するオブジェクト。 |
| 3DSS ドキュメント | 3DSS document | （ルートオブジェクト） | ファイル構造 | `.3dss.json` ファイルとして保存される、3DSS スキーマに準拠した JSON ドキュメント。 |

## 2.2 signification / relation / sense

| 用語             | 英語表記          | スキーマキー                        | カテゴリ   | 定義・説明 |
|------------------|-------------------|--------------------------------------|------------|-----------|
| signification    | signification     | `signification`                     | 意味付与   | lines / points / aux に付随する「意味付け」ブロック。relation や sense、description などを含む。 |
| relation         | relation          | `signification.relation`           | 関係種別   | 関係の性質を表す小オブジェクト。`structural` / `dynamic` / `logical` / `temporal` / `meta` などの軸で分類する。 |
| structural       | structural        | `signification.relation.structural` | 関係種別   | 構造上の結び付き（包含／階層／連結など）を表す列挙値群。 |
| dynamic          | dynamic           | `signification.relation.dynamic`    | 関係種別   | 変化・流れ・因果・反復などの「動的な」関係を表す列挙値群。 |
| logical          | logical           | `signification.relation.logical`    | 関係種別   | 論理関係（同値／否定／含意／支持／反論など）を表す列挙値群。 |
| temporal         | temporal          | `signification.relation.temporal`   | 関係種別   | 時間的な前後関係・期間・同期／非同期などを表す列挙値群。 |
| meta relation    | meta              | `signification.relation.meta`       | 関係種別   | メタレベルの関係（注釈／コメント／引用関係など）を表す列挙値群。 |
| sense            | sense             | `signification.sense`               | 方向性     | lines の A→B の向きに対する意味（a_to_b / b_to_a / bidirectional / neutral）を示す列挙。 |
| description      | description       | `signification.description` や `document_meta.description` | 説明 | 自然言語による説明文。構造そのものではなく、要素・ドキュメントの意味を補足する。 |

## 2.3 appearance（見え方）

| 用語           | 英語表記       | スキーマキー                  | カテゴリ       | 定義・説明 |
|----------------|----------------|--------------------------------|----------------|-----------|
| appearance     | appearance      | `appearance`                  | 見た目         | 各要素（lines / points / aux）の見え方（位置・色・形状・アニメーションなど）をまとめたブロック。 |
| position       | position        | `appearance.position`        | 空間属性       | 要素の三次元座標（x, y, z）。3DSL 座標系に基づいて定義される。 |
| rotation       | rotation        | `appearance.rotation`        | 空間属性       | 要素の回転。オイラー角／クォータニオンなど、実装依存の形式で表現される。 |
| scale          | scale           | `appearance.scale`           | 空間属性       | 要素の拡大率。x/y/z 各軸のスケールを示す。 |
| color          | color           | `appearance.color`           | 視覚属性       | 要素の基本色。RGB / RGBA などの形式（仕様書参照）で表現。 |
| line_type      | line type       | `appearance.line_type`       | 視覚属性       | 線の幾何タイプ（straight / polyline / catmullrom / bezier / arc など）の列挙。 |
| line_style     | line style      | `appearance.line_style`      | 視覚属性       | 線のスタイル（solid / dashed / dotted / double / none など）の列挙。 |
| arrow          | arrow           | `appearance.arrow`           | 視覚属性       | 矢印の形状・配置などをまとめたブロック。 |
| arrow.shape    | arrow shape     | `appearance.arrow.shape`     | 視覚属性       | 矢印ヘッドの形状（cone / pyramid / line など）。 |
| arrow.placement| arrow placement | `appearance.arrow.placement` | 視覚属性       | 矢印をどちら側に付けるか（end_a / end_b / both / none）。 |
| effect         | effect          | `appearance.effect`          | 動的表現       | パルス・フロー・グローなど、視覚的エフェクトの設定をまとめたブロック。 |
| effect_type    | effect type     | `appearance.effect.effect_type` | 動的表現   | エフェクト種別（none / pulse / flow / glow など）の列挙。 |
| easing         | easing          | `appearance.effect.easing`   | 動的表現       | エフェクトの時間変化（linear / ease-in / ease-out / ease-in-out など）。 |

## 2.4 points 周辺

| 用語           | 英語表記   | スキーマキー                        | カテゴリ   | 定義・説明 |
|----------------|------------|--------------------------------------|------------|-----------|
| marker         | marker     | `points[].appearance.marker`        | 視覚属性   | point を画面上で示すマーカー。形状やテキストラベル、アイコンなどを含む。 |
| marker.shape   | marker shape| `marker.shape`                      | 視覚属性   | マーカーの形状（sphere / box / cone / pyramid / corona / none など）。 |
| marker.text    | marker text | `marker.text`                       | 視覚属性   | テキストラベルの内容・配置・フォントなどをまとめたブロック。 |
| align          | align       | `marker.text.align`                | 視覚属性   | テキストの整列位置（left&top など 3×3 の組合せ）を示す列挙。 |

## 2.5 aux.module 周辺

| 用語           | 英語表記    | スキーマキー                          | カテゴリ   | 定義・説明 |
|----------------|-------------|----------------------------------------|------------|-----------|
| module         | module      | `aux[].appearance.module`             | 補助モジュール | grid / axis / plate / shell / hud などの補助要素をまとめるサブオブジェクト。 |
| grid           | grid        | `module.grid`                         | 補助要素   | 格子（グリッド）表示。スケールや分割数などの設定を持つ。 |
| axis           | axis        | `module.axis`                         | 補助要素   | XYZ 軸などの基準軸表示。原点位置や軸長、色などの設定を持つ。 |
| plate          | plate       | `module.plate`                        | 補助要素   | 平面（床・壁など）としての補助要素。領域を示す板状オブジェクト。 |
| shell          | shell       | `module.shell`                        | 補助要素   | 立体的な包み（空間の外形）を表す補助要素。 |
| HUD module     | hud         | `module.hud`                          | 補助要素   | ビュー内に重ねて表示される情報レイヤ（HUD）のための補助要素。 |

---

# 3 document_meta と管理情報

## 3.1 document_meta の主な項目

| 用語           | 英語表記   | スキーマキー               | カテゴリ   | 定義・説明 |
|----------------|------------|---------------------------|------------|-----------|
| title          | title      | `document_meta.title`     | 管理情報   | 構造データ全体のタイトル。 |
| author         | author     | `document_meta.author`    | 管理情報   | 作者・制作者情報。単一文字列または構造化情報（仕様書参照）。 |
| version        | version    | `document_meta.version`   | 管理情報   | 3DSS ドキュメントのバージョン。SemVer 形式を前提とする。 |
| created_at     | created_at | `document_meta.created_at`| 管理情報   | ドキュメント生成日時。 |
| updated_at     | updated_at | `document_meta.updated_at`| 管理情報   | 最終更新日時。 |
| tags           | tags       | `document_meta.tags`      | 管理情報   | 任意のタグ配列。分類・検索のために利用される。 |
| units          | units      | `document_meta.units`     | 管理情報   | 長さや時間などの単位系をまとめた設定。 |
| reference      | reference  | `document_meta.reference` | 管理情報   | 外部資料・URL・文献などへの参照情報。 |

## 3.2 uuid / ref / id 系

| 用語         | 英語表記 | スキーマキー             | カテゴリ     | 定義・説明 |
|--------------|----------|-------------------------|--------------|-----------|
| uuid         | uuid     | `points[].uuid` など    | 識別子       | 各要素を一意に識別するための ID。表示 UI では通常非表示とし、内部参照のみを目的とする。 |
| name         | name     | `points[].name` など    | ラベル       | ユーザが理解しやすい名称。構造データの「表札」として機能し、表示にも用いられる。 |
| ref          | ref      | `lines[].ref` など      | 参照         | 他の要素や外部リソースを参照するためのフィールド。構造的なリンクではなくメタ参照として扱う。 |

---

# 4 座標系・フレーム・時間

## 4.1 座標系

| 用語           | 英語表記          | スキーマキー   | カテゴリ   | 定義・説明 |
|----------------|-------------------|----------------|------------|-----------|
| 3DSL 座標系     | 3DSL coordinate system | -          | 座標系     | 3DSL/3DSS において統一された座標系。Z+ 軸を絶対鉛直上向きとし、X/Y/Z の直交三軸で構成される。 |
| Z+ 軸          | Z+ axis           | -              | 座標系     | 常に「上」を指す絶対基準の軸。観察者の視点に関わらず、重力に逆らう方向として解釈される。 |
| chirality      | chirality         | -              | 座標系     | 左手系／右手系の区別。3DSL では viewer/modeler 間で座標系のキラリティが一致するように設計する。 |
| coord          | coord             | `spatial.coord` など | 座標系 | 座標値をまとめる内部表現。`position` などで利用される。 |

## 4.2 フレーム（frames）

| 用語           | 英語表記 | スキーマキー                 | カテゴリ   | 定義・説明 |
|----------------|----------|-----------------------------|------------|-----------|
| frame          | frame    | `appearance.frames` など    | 時間・層   | 時間や状態の「層」を表す単位。構造の別バリエーションや時系列変化を切り替えるために用いる。 |
| frame_id       | frame_id | `...frames[].frame_id`      | 時間・層   | フレームを識別する ID。整数または文字列で扱われ、viewer のフレーム切替 UI と連携する。 |
| frames 配列     | frames   | `appearance.frames` など    | 時間・層   | 各フレームごとの appearance 変化や存在有無を記述する配列。 |

---

# 5 UI / アプリ関連用語

## 5.1 共通 UI

| 用語           | 英語表記   | スキーマキー | カテゴリ   | 定義・説明 |
|----------------|------------|--------------|------------|-----------|
| HUD            | HUD (Head-Up Display) | `aux.module.hud` など | UI | ビュー内に重ねて表示される情報レイヤ。カメラパラメータ・フレーム情報・ヘルプなどを表示する。 |
| navigator      | navigator  | -            | UI         | ビュー内での位置・向き・ズームなどを操作する UI コンポーネント（実装詳細は各仕様書参照）。 |
| tooltips       | tooltips   | -            | UI         | UI 要素やセルの上に表示される補足テキスト。入力内容やスキーマ上の意味を説明する。 |

## 5.2 modeler 固有の用語（代表）

| 用語                    | 英語表記           | スキーマキー | カテゴリ   | 定義・説明 |
|-------------------------|--------------------|--------------|------------|-----------|
| prep-import パイプライン| prep-import pipeline | -          | データフロー | `.3dss-prep.json` を読み込み、name 主体の疎データから temp_point を生成し、空間編集・数値入力で 3DSS に落とし込む流れ。 |
| Direct Spatial Editing  | Direct Spatial Editing | -        | 編集機能   | 3D ビュー上で points / lines / aux を直接ドラッグ・操作して位置や形状を編集する機能。 |
| データ入力モード        | data entry mode    | -            | レイアウト | 表形式中心で行単位のデータを編集する mode。プレビューは補助的に利用される。 |
| ビジュアル編集モード    | visual editing mode | -          | レイアウト | 3D ビューを中心に構造を構築する mode。右クリックメニューやダイアログを多用する。 |

## 5.3 viewer 固有の用語（代表）

| 用語             | 英語表記       | スキーマキー | カテゴリ   | 定義・説明 |
|------------------|----------------|--------------|------------|-----------|
| frame 切替        | frame switching | -           | 閲覧操作   | 3DSS 内の `frames` 情報に基づき、異なる時間層・状態を切り替えて表示する機能。 |
| レイヤ表示切替    | layer toggling | -           | 閲覧操作   | lines / points / aux 各レイヤの表示・非表示を切り替える機能。 |
| read-only        | read-only      | -           | 性質       | viewer が構造データを変更しない性質。`.3dss.json` を純粋に参照するのみとする。 |

---

# 6 ファイル・スキーマ関連

## 6.1 ファイル種別

| 用語              | 英語表記       | ファイル名・拡張子        | カテゴリ     | 定義・説明 |
|-------------------|----------------|---------------------------|--------------|-----------|
| 3DSS 構造ファイル | 3DSS structure file | `*.3dss.json`       | 構造データ   | 3DSS スキーマに準拠した構造データ本体。viewer はこの出力のみを入力として扱う。 |
| prep ファイル     | prep file      | `*.3dss-prep.json`        | 入力補助     | name 主体の疎な入力データ。modeler の prep-import パイプラインで temp_point として読み込まれる。 |
| スキーマ本体      | schema file    | `/schemas/3DSS.schema.json` | スキーマ | 3DSS 構造データの公式 JSON スキーマ。single source of truth。 |
| prep 用スキーマ   | prep schema    | `/schemas/3DSS-prep.schema.json` | スキーマ | prep ファイルの最小限スキーマ。name リストなどを検証する。 |

## 6.2 ディレクトリ／メタファイル（代表）

| 用語              | 英語表記         | パス例                       | カテゴリ   | 定義・説明 |
|-------------------|------------------|------------------------------|------------|-----------|
| specs ディレクトリ| specs directory  | `/specs/`                   | リポジトリ | 仕様書（3DSD-common / modeler / viewer / 3DSS_spec など）を置くディレクトリ。 |
| schemas ディレクトリ| schemas directory| `/schemas/`                 | リポジトリ | 3DSS / prep の JSON スキーマファイル群を置くディレクトリ。 |
| code ディレクトリ | code directory   | `/code/common`, `/code/modeler`, `/code/viewer` | リポジトリ | 実装コード（共通・modeler・viewer）を置くディレクトリ。Codex の出力ターゲットとなる。 |
| logs ディレクトリ | logs directory   | `/logs/runtime`, `/logs/codex` | リポジトリ | 実行ログ・Codex ログなどを格納するディレクトリ。 |

---

# 7 本書の更新方針

- 新たな列挙値・モジュール・ UI コンポーネントを追加した場合、
  - まず `/schemas/3DSS.schema.json` および関連仕様書（3DSD-common / modeler / viewer）を更新する。
  - そのうえで、本書の該当セクション（カテゴリ）に用語を追記する。

- スキーマから削除禁止の原則に従い、本書でも既存用語の削除は行わず、
  非推奨化された用語には「deprecated」などの注記を追加する。

- Codex 実行指示において新たに重要となった用語は、
  AGENTS.md の更新とあわせて本書に反映することを推奨する。

