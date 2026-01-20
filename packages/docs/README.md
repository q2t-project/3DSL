# packages/docs（ドキュメントSSOT）

この `packages/docs/` は **サイトとリポジトリ全体のドキュメントSSOT** をまとめる場所や。

ここで一番大事な規範はこれ：

- **SSOT は `packages/docs/**`**
- **`apps/site/src/content/**` は生成物（mirror）**
  - 手で編集せん
  - git で追跡せん（追跡してたら削除）

## ディレクトリ規約（固定）

`packages/docs/` の下は、役割ごとに **“別ルート”** を切って混ぜへん。

- `packages/docs/docs/`
  - サイト公開向け **Docs コレクション**（設計・運用・契約など）
  - mirror: `apps/site/src/content/docs/`

- `packages/docs/faq/`
  - サイト公開向け **FAQ コレクション**
  - mirror: `apps/site/src/content/faq/`

- `packages/docs/policy/`
  - サイト公開向け **Policy コレクション**（免責・引用方針・利用条件/ライセンス等）
  - mirror: `apps/site/src/content/policy/`

- `packages/docs/repo/`
  - repo 内ナビ（地図/索引/運用の入口）。サイト公開とは別枠。

### 重要：混入禁止（衝突の元）

次は **作らん**（= もし存在したら移動して消す）：

- `packages/docs/docs/policy/`（Policy は `packages/docs/policy/` が SSOT）
- `packages/docs/docs/faq/`（FAQ は `packages/docs/faq/` が SSOT）

理由：mirror とルーティングが二重化して、運用が恣意的になるから。

## mirror（生成）

SSOT をサイトへ反映するのは `apps/site/scripts/sync/docs.mjs`。

- `npm --prefix apps/site run sync:docs`
- ふだんは `apps/site` の `predev` / `prebuild` が `sync:all` で自動実行する

## 生成物（apps/site/src/content）を追跡してしまった時の掃除

もし過去に `apps/site/src/content/{docs,faq,policy}` をコミット済みなら、
一回 index から外して SSOT に寄せる。

- `git rm -r --cached apps/site/src/content/docs apps/site/src/content/faq apps/site/src/content/policy`
- その後 `npm --prefix apps/site run sync:docs`

