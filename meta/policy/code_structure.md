================================
code_structure.md（コード構成方針）
================================

# 0. 目的と適用範囲

本書は 3DSL リポジトリにおける `/code/` 配下の **ディレクトリ構成・役割・エントリポイント** を定める。

- 仕様の正本は `/specs/*.md` および `/schemas/*.json` とし、本書はそれに従う実装側の配置ルールのみを定義する。
- 外部ライブラリ（vendor）の扱いは `/meta/policy/vendor_policy.md` を参照する。

対象範囲：

- `/code/common/`
- `/code/modeler/`
- `/code/viewer/`
- `/code/vendor/`（参照のみ）

---

# 1. `/code/` トップレベル構成

```text
/code/
├── common/   # 共通ロジック・共通UI
├── modeler/  # 生成アプリ（modeler）専用実装
├── viewer/   # 閲覧アプリ（viewer）専用実装
└── vendor/   # 外部ライブラリ（read-only）
```

## 1.1 共通ルール

- 新規に追加される JS/TS コードは、必ず common/・modeler/・viewer/ のいずれかに配置する。
 - /code/ 直下に単独ファイルを置かない。
- Node / ブラウザともに ES Modules 前提 とし、拡張子は .mjs を推奨する。
- /code/vendor/ は 外部ライブラリ領域（read-only） であり、アプリ側コードはここを import で参照するだけとする。

# 2. /code/common/ 構成

/code/common/
├── assets/
│   ├── css/
│   │   ├── 3dsd_theme.css
│   │   ├── 3dsd_ui.css
│   │   └── 3dsd_table.css
│   ├── fonts/
│   ├── icons/
│   ├── images/
│   ├── logo/
│   ├── textures/
│   ├── assets_manifest.json
│   ├── README.md
│   └── report_template.html
├── core/
├── hud/
├── renderer/
├── ui/
├── utils/
└── validator/


## 2.1 assets/css
- 3dsd_theme.css
 - 共通テーマ定義。色・フォント・余白・レイアウト基準など。
 - modeler / viewer のいずれからも参照される。
- 3dsd_ui.css
 - 共通 UI コンポーネント（パネル／ボタン／モーダル等）のスタイル。
- 3dsd_table.css
 - Modeler の表形式入力（グリッド／セル）のスタイルを中心としたテーブル用 CSS。

原則として：
- アプリ固有のスタイルは各アプリ配下 code/modeler/assets/css/・code/viewer/assets/css/ に置き、
- 共通化できる部分のみ code/common/assets/css/ に集約する。

## 2.2 core / renderer / hud / ui / utils / validator
- core/
 - 3DSS に依存する共通ドメインロジック。
 - 例：座標系・frames 解釈・色変換など。
- renderer/
 - three.js を用いた共通描画ロジック（シーン生成／カメラ／ライト／共通マテリアル等）。
- hud/
 - modeler / viewer 共通で利用する HUD の基盤ロジック。
 - HUD は アプリ利用者へのリアルタイム情報表示専用 とし、
 仕様外のデバッグ情報や開発用メトリクスを載せない。
- 開発者向けのログ・計測は /logs/ など別経路に出力し、HUD とは混在させない。
- ui/
 - JS ベースの共通 UI パーツ（汎用パネル・ダイアログ等）。
 - 上記 CSS（3dsd_ui.css）と組み合わせて使用する。

- utils/
 - 汎用ユーティリティ（ログ整形、型ガード、日付/数値ユーティリティなど）。
- validator/
 - 3DSS / 3DSS-prep に対する ランタイム検証ロジック。
 - AJV など /code/vendor/ のライブラリをラップし、modeler / viewer 両方から利用される。


# 3. /code/modeler/ 構成

/code/modeler/
├── assets/
│   └── css/          # modeler 専用CSS（共通CSS + 追加分）
├── core/
├── exporter/
├── extensions/
│   ├── latex/
│   ├── macro/
│   ├── parametric/
│   └── semantic_generation/
├── hud/
├── importer/
├── renderer/
├── ui/
├── utils/
└── validator/

## 3.1 エントリポイント
- ブラウザ側エントリ HTML
 - code/modeler/ui/index.html
- JS エントリモジュール
 - code/modeler/core/main.mjs
 index.html では、最低限次を読み込むことを前提とする：
- 共通 CSS：
 ../../common/assets/css/3dsd_theme.css
 ../../common/assets/css/3dsd_ui.css
 ../../common/assets/css/3dsd_table.css
- modeler 専用 CSS：../assets/css/*.css（必要に応じて）
 main.mjs は modeler アプリの起点であり、
- 3DSS / 3DSS-prep の validator
- three.js ベースの renderer
- HUD / UI の初期化・イベント登録
などを呼び出す。

## 3.2 各ディレクトリの役割（modeler）
- exporter/
 - .3dss.json や各種スナップショット等、構造データを書き出す処理 一式。
 - viewer 側で消費される .3dss.json の生成もここが担う。
- extensions/
 - latex / macro / parametric / semantic_generation など、拡張プラグイン群。
 - 3DSS 本体とは切り離せるオプション機能をまとめる。
- hud/
 - modeler 専用 HUD 実装。
 - 共通 HUD 基盤（code/common/hud/）を利用しつつ、
 編集モード・選択中要素・警告状態などを ユーザ向けに表示 する。
- 仕様に無い内部デバッグ用途はここに混在させない。
- importer/
 - .3dss-prep.json など prep 用入力の取り込み処理 を担当する。
 - /schemas/3DSS-prep.schema.json を参照し、
 name ベースの疎なデータを内部の temp_point／points などへ写像する。
 - ファイル I/O 自体は /data/imports/ と連携する Node / ブラウザ層に任せ、
 importer は「構造変換ロジック」に集中させる。
- renderer/
 - modeler 専用描画拡張（編集用 gizmo、選択ハイライト、ドラッグ操作など）。
- ui/
 - modeler 特有の UI 構造（シート、ツールバー、モード切替など）。
- utils/
 - modeler 専用のユーティリティ。
- validator/
 - modeler 入力の事前チェックなど、common/validator の薄いラッパー。

# 4. /code/viewer/ 構成

/code/viewer/
├── assets/
│   ├── css/
│   └── icons/
├── core/
├── extensions/
├── hud/
├── renderer/
├── ui/
├── utils/
└── validator/

## 4.1 エントリポイント
- ブラウザ側エントリ HTML
 - code/viewer/ui/index.html
- JS エントリモジュール
 - code/viewer/core/main.mjs

index.html では：
- 共通 CSS（theme/ui）を読み込む
- viewer 専用 CSS は viewer/assets/css/ から読み込む
- main.mjs は viewer アプリの起点であり、
- .3dss.json の読み込み
- シーンセットアップ
- フレーム切替・レイヤ表示切替・HUD 初期化
などを行う。

## 4.2 各ディレクトリの役割（viewer）
- extensions/
 - 表示専用の拡張プラグイン。
 - 例：特殊なカメラモード、テーマ切替、簡易アノテーション表示など。
- hud/
 - viewer 専用 HUD（現在フレーム、座標／スケール、選択中要素情報など）。
 - HUD はあくまで閲覧者向けの表示レイヤであり、
 デバッグログや内部メトリクスは含めない。
- renderer/
 - viewer 専用描画ロジック（カメラ制御、アニメーション、ポストエフェクト等）。
- ui/
 - viewer 専用 UI（パネル構成、設定ダイアログ、レイヤ・フレーム切替 UI など）。
- utils/ / validator/
 - viewer 専用ユーティリティ、および common/validator のラッパー。

viewer には exporter/ ディレクトリは設けない。
構造データ（.3dss.json）の出力は modeler 側の責務とし、viewer は read-only を徹底する。

## 5. scripts ディレクトリとの関係
- ルート直下の /scripts/ には、Node 実行用の CLI スクリプト（.mjs）を配置する。
 - 
- 例：scripts/dev_modeler.mjs, scripts/dev_viewer.mjs, scripts/ validate_3dss.mjs 等。
- これらのスクリプトは、/code/common/, /code/modeler/, /code/viewer/ 内のモジュールを import して利用する。
- /code/scripts/ を使用する場合は、実装寄りの補助スクリプト（ビルド時内部ツールなど）に限定し、
ルート /scripts/ との役割が重ならないようにする。

# 6. 命名・実装に関する補足ルール
1. ES Modules 前提
 - ブラウザ・Node 共に type: module 前提とし、新規 JS ファイルは .mjs を基本とする。
 - 既存 .js ファイルを追加する場合も、モジュールとして実装する。

2. アプリ横断の共通処理
 - 共通化できる処理は、可能な限り /code/common/ 配下に置き、
 modeler / viewer 側から import して再利用する。

3. 仕様との対応
 - 新しいディレクトリやエントリポイントを追加する場合は、
 先に /specs/3DSD-modeler.md または /specs/3DSD-viewer.md に反映し、
 その後で /code/ を更新する。

4. vendor の扱い
- /code/vendor/ 配下の構成・更新手順は /meta/policy/vendor_policy.md に従う。
- アプリコードは /code/vendor/ 経由でライブラリを import し、
node_modules や CDN から直接参照しない。

