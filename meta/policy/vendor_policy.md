================================
vendor_policy.md（外部ライブラリ運用方針）
================================

# 0. 目的と適用範囲

本書は 3DSL リポジトリにおける **外部 JavaScript ライブラリの配置・更新・利用ルール** を定める。

- 配置場所：`/code/vendor/`
- 対象：three.js／AJV／AJV-Formats／Chart.js／FileSaver など、
  アプリ実行時に利用する第三者ライブラリ一式
- 適用対象：
  - Human（更新・導入の実施）
  - ChatGPT（仕様／方針文書の作成補助）
  - Codex（実装生成時の参照）

本書は `/AGENTS.md` および `/specs/3DSD-common.md` とあわせて運用する。

---

# 1. ベンダーディレクトリ構成

外部ライブラリは、次の構成で管理する。

```text
/code/vendor/
├── ajv/
│   ├── dist/
│   ├── lib/
│   ├── LICENSE
│   ├── package.json
│   └── README.md
├── ajv-formats/
├── chart.js/
├── filesaver/
└── three/
```

## 1.1 基本原則
- 各ライブラリは 1 ディレクトリ = 1 ライブラリ とする。
- ライブラリ配下には、原則として npm パッケージから取得した内容を そのまま 配置する。
 - dist/, lib/, LICENSE, package.json, README.md などを含む。
- ライブラリ名称（ajv, three など）は、公式パッケージ名に準拠する。

# 2. 役割分担と権限
## 2.1 Human
- /code/vendor/ 以下のライブラリの
 - 追加
 - バージョン更新
 - 削除
を行う唯一の主体とする。

許可される主な作業
- npm からのダウンロード、/code/vendor/ への展開
- 必要に応じたバージョン固定・差し替え
- ライセンスファイルの確認・追記

## 2.2 ChatGPT
- 本ポリシー文書や関連仕様への反映案を提示する。
- ライブラリ利用箇所（import パスなど）の整理・文書化を支援する。

#### 禁止
- /code/vendor/ の具体的な構成変更案（追加・削除・差し替え）を Codex に直接指示すること。

## 2.3 Codex
- /code/vendor/ 以下のファイルは 読み取り専用 とする。
- いかなる場合も /code/vendor/ 配下の
 - 追加
 - 更新
 - 削除
を行ってはならない。

Codex が vendor ライブラリを利用する場合は、既存の import パスを参照し、
アプリケーションコード側（/code/common/, /code/modeler/, /code/viewer/ など）のみを生成・修正する。

# 3. 利用ルール（import 方針）
## 3.1 共通方針
- 実行時に利用する外部ライブラリは、原則として /code/vendor/ からのみ import する。
- CDN や node_modules からの直接 import は行わない（ツールチェーン内部を除く）。

## 3.2 import パスの管理
- three.js, AJV などの import 入口は、レイヤごとに 統一パス を定める。
 - 例（イメージ）：

// three.js（共通）
import * as THREE from "../../vendor/three/build/three.module.js";

// AJV（共通 validator 経由）
import Ajv from "../../vendor/ajv/dist/jtd.js";

- これらの「標準 import パス」は、/specs/3DSD-common.md または /meta/policy/ の関連文書で明示する。

- 新たな import パターンを追加する場合は、
 - 既存パスとの一貫性
 - 将来の vendor 更新時の影響範囲
を確認した上で、人間がレビューする。

## 3.3 アダプタ層の推奨
- 直接 vendor を多箇所で叩く代わりに、必要に応じて /code/common/validator/ などに アダプタ層 を設ける。
- 例：
 - AJV 初期化処理
 - 共通バリデーションユーティリティ
- これにより、将来のライブラリ入れ替え時に、変更箇所を局所化する。

# 4. 更新手順（概要）
ベンダーライブラリのバージョンアップや追加は、次の流れで行う。
1. Human が対象ライブラリの新バージョンを確認し、ローカルで取得する。
2. /code/vendor/<library>/ をバックアップ（任意）した上で、新バージョンに差し替える。
3. ライセンス表記や README 差分を確認し、必要に応じて /meta/policy/ や LICENSE の記載に反映する。
4. アプリケーションコードの import 入口と互換性を確認する。
5. 必要であれば、Codex に対して
 - validator アダプタやラッパーコードの修正
 - 影響箇所のリファクタリング
を別途タスクとして発行する。

※ vendor 更新そのものは Codex のタスクに含めない。

# 5. ライセンスおよびトレース
- /code/vendor/ 配下の LICENSE, README.md, package.json は 必ず保持 する。
- 3DSL 全体のライセンス方針は LICENSE および /meta/policy/ 配下の文書に従う。
- 外部ライブラリのバージョン変更時には、簡潔なメモを
 - /meta/logs/ もしくは
 - リポジトリの commit メッセージ
で残し、どのバージョンからどのバージョンへ更新したかを辿れるようにする。

# 6. 将来拡張
- 新たなライブラリを導入する場合も、本方針に従い /code/vendor/<name>/ に配置する。
- ビルドツール・テストフレームワークなど、開発時のみ利用する依存は、
 - node_modules および package.json の devDependencies で管理し、
 - /code/vendor/ には配置しない。

本ポリシーに反する運用が必要になった場合は、
まず /meta/policy/ 側で方針変更案を作成し、
Human の承認後にリポジトリへ反映する。