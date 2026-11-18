# Library 個別ページ方針

## 関連SSOT

- 登録手順（SSOT）: `packages/docs/docs/library/workflow.md`
- `_meta.json` フィールド辞書（SSOT）: `packages/docs/docs/library/meta-fields.md`

このページは **Library 詳細ページの表示方針**（SEO/UX/ページ構造）を固定する。
データ定義や運用手順のSSOTは上のドキュメントに集約する。


## サイトで最初に体験するもの

3DSLアトラスを主な入口にする。トップを開いた人はその場でひとつのモデルを回し、興味を持った部分に近づける。一覧から来た人も、作品カードを一度開けば同じ操作ができる。3DSLの思想と記法、制作手順は、知りたくなった時点で開けるようにする。

## URL とデータ配置

* 一覧: `/library/`
* 個別ページ: `/library/<id>/`（`<id>` は `packages/3dss-content/library/<id>` のフォルダ名）
* 個別データ: `/_data/library/<id>/...`

個別ページは **HTML（Astro）**で構成し、モデル本体・テキスト・画像等は `/_data/library/<id>/` から参照する。


### 表示メタのSSOT（重要）

- **表示に使うタイトル/要約/タグ/created/revised は `model.3dss.json` の `document_meta` がSSOT**。
- `_meta.json` は「公開台帳（published/published_at/republished_at）」と「出典/権利/制作情報/添付等」を扱う。
- `_meta.json` に表示メタ（title/summary/tags/created_at/updated_at 等）を重複させるのは **コンタミ** として禁止（チェックで弾く）。

## トップ、一覧、作品ページの役割

| 場所 | 最初にできること | そこから進める先 |
| --- | --- | --- |
| トップ `/` | 代表作をその場で操作する | 代表作のページ、ほかの作品、折りたたんだ「3DSLについて・使い方」 |
| 一覧 `/library/` | 作品の見た目と名前から選ぶ | カードの主リンクで作品ページへ、直接大きく見たい人はViewerへ |
| 作品 `/library/<id>/` | 題名と要約を見て、モデルを回す・選ぶ・寄る | 全景に戻る、大きく開く、解説、出典、JSON |
| Viewer `/app/viewer/` | 図を大きく表示し、要素を検索して選ぶ | フレーム・表示条件を変える、作品の入口へ戻る |

## HTMLで共通にする範囲

| 扱い | 約束 |
| --- | --- |
| 全作品で共通 | 正規の作品URL、題名と短い要約、最初の画面で触れる図、対象に寄る操作と全景に戻る操作。縦長のスマホとPCで使えること。共通Viewerに同じモデルを渡す。 |
| 標準 | 解説は初期HTMLの折りたたみに置く。出典・権利・添付は作品に応じて掲載する。モデルの選択やドラッグとリンクのタップを同じ場所に重ねない。 |
| テーマが決める | 軸が何を表すか、作者が指定する文字の正面と向き、対象間の関係、専門用の操作。圧力を変える、二つの状態を比較するといった操作は必要な作品だけに設ける。 |

サイト版は作品ページの共通テンプレートとViewerから配信する。同じ作品を単体HTMLで届ける場合は、同じ版の3DSSと必要なテーマ固有情報から生成する。二つの形式を手で同期する負担を避けられる。「オフラインで開ける」という配布表示は、通信を切り、ダウンロードした一つのファイルを開いて確認できた作品に付ける。

## 整備の順序

1. **共通の入口とズーム**。トップと既存の作品ページに操作可能な図を置く。全景と選択対象が画角に収まること、寄った後に同じフレームの全景へ戻れることを検査用モデルで確認する。
2. **大きく開いたときの視点の引き継ぎ**。作品ページで選んだ対象、角度、倍率、表示フレームを、同じ作品を大きく開いた直後も保つ。初めて開く人には全景を表示する。
3. **選んだ作品に戻れる一覧**。一覧の絞り込み・並び順・スクロール位置を、作品から戻ったときに復元する。別の作品を続けて探す際の手戻りを減らす。
4. **代表作と個別HTML**。制作側でメタアトラスが公開可能になったら、トップの代表作を明示的に指定する。テーマが固まってから、固有操作を一つ持つ作品でサイト版と単体HTMLの表示・操作を比較する。共通化する操作は、実作品で繰り返し必要になったものから選ぶ。

## コンテンツの書き方

### ファイル配置（SSOT）

`packages/3dss-content/library/<id>/` に置く。

* `model.3dss.json`（必須）
* `_meta.json`（推奨/実質必須）
* `content.md`（任意…テキスト）
* `assets/`（任意…テキスト用の画像など）
* `attachments/`（任意…PDF などの添付）

### メタ情報の SSOT（決定）

#### 背景

`model.3dss.json`（`document_meta`）と `_meta.json` の両方に、タイトル・要約・タグ等の「表示用メタ情報」を持たせると、
どちらが正（SSOT）かが分からなくなり、更新漏れや不整合が発生しやすい。

このため、Library の **表示用メタ情報（カード/詳細ページの見出しに出るもの）** の SSOT を
`model.3dss.json`（`document_meta`）に一本化する。

`_meta.json` は **台帳**として、公開状態・SEO・権利・参考文献・導線・添付の表示設定のみを持つ。

#### ルール（SSOT）

* `model.3dss.json` の `document_meta` は **表示メタ + タイムライン** の SSOT。
  * **フィールド名は固定**（fallback しない）。
  * 公開アイテム（`_meta.json.published:true`）では下記が必須。

必須（published:true のとき）

* `document_title`（string, non-empty）
* `document_summary`（string）
* `tags`（string[]）
* `created_at`（timestamp_utc）
* `revised_at`（timestamp_utc）

* `_meta.json` は **公開台帳・SEO・権利・参照・添付/導線設定** の SSOT。
  * **禁止キー**：`title` / `summary` / `tags` / `created_at` / `updated_at`
  * **許可キー（トップレベル）**：
    `published`, `published_at`, `republished_at`, `description`, `seo`, `rights`, `references`,
    `entry_points`, `pairs`, `related`, `page`, `recommended`, `hidden`, `provenance`, `links`, `authors`
  * 上記以外の未知キーは drift 防止のため **エラー**とする（チェックで弾く）。

#### 公開/更新の運用ルール（published / published_at / republished_at）

Library の公開状態は `_meta.json` 側でのみ管理する。

* `published`（boolean）
  * 現在の公開状態。
* `published_at`（timestamp_utc）
  * **初回公開日（固定）**。`published:false -> true` の初回遷移でセットし、それ以降は変更しない。
* `republished_at`（timestamp_utc）
  * **更新日**。公開後の更新を表す。
  * 公開中（`published:true`）に、`document_title/document_summary/tags/テキスト/SEO/権利/添付` 等の掲載要素を変更した場合に更新する。

表示上の扱い（/library 一覧など）

* 「公開日」= `published_at`
* 「更新日」= `republished_at`
* 並び替えの基準 = `republished_at ?? published_at`

キー名は JSON の扱いやすさのため **`republished_at`（ハイフン無し）に統一**する。

#### dist（生成物）

dist 生成（`packages/3dss-content/scripts/build-3dss-content-dist.mjs`）では、SSOT の `model.3dss.json` をそのまま配布/サイト用へコピーする。
表示メタは SSOT が `model.document_meta` なので、`_meta.json` から `model` へ注入（merge）しない。

* Library HTML（SEO/UX）: `model.3dss.json`（表示メタ）+ `_meta.json`（台帳）
* Viewer での単体モデル表示: `model.3dss.json` の `document_meta` を利用

### Markdown に画像を混ぜる

テキストは通常の Markdown を使う。

```md
テキスト…

![説明文](/_data/library/<id>/assets/figure-01.png)

テキスト…
```

推奨は **絶対パス**（`/_data/library/<id>/...`）。
相対パスは URL 解決が紛れやすいので避ける。

## 広告の方針

トップとモデルの操作面には広告を置かない。作品ページで広告を表示できる場合も、本文側かPCの右レールを使う。スマホの図の手前に広告は置かない。

`_meta.json` の `page.ads` で作品ごとに表示枠を選べる。`[]` は広告なし。既存の `mobile_top` 指定は解説の後に表示し、`inline_1` との両方が選ばれても同じ場所に二枠を並べない。配信の可否はサイト全体の広告設定に従う。

## 実装とビルド手順

### dist 生成（packages/3dss-content）

`packages/3dss-content/scripts/build-3dss-content-dist.mjs` が以下を生成する。

* `packages/3dss-content/dist/library/<id>/...`（サイト用: _meta/content/assets/attachments/model）
* `packages/3dss-content/dist/3dss/library/<id>/model.3dss.json`（互換用: 既存の viewer リンク維持）
* `packages/3dss-content/dist/library/library_index.json`

### サイトへ同期（apps/site）

`apps/site/scripts/sync/3dss-content.mjs` が以下を行う。

* `apps/site/public/_data/library/...` にコピー
* `apps/site/src/content/library_items/<id>.md` を生成（`content.md` がある場合のみ）

作品ページはビルド時に `content.md` を HTML 化し、解説として埋め込む。
