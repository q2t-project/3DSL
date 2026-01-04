```md
# 3DSS Library 保存・管理ルール（採番ID方式）

## 目的
`packages/3dss-content/library/` は 3DSL Library に掲載する **コンテンツ本体（モデル）**を保存・管理する保管庫とする。  
表示順・棚（おすすめ等）は **サイト側の編集情報**で扱い、ここにはコンテンツを蓄積する。

---

## 採番ID（主キー）

### 形式
- `YYMMDDxx` の **8文字**を採番ID（= 主キー）とする
- `YYMMDD` は **採番日**（意味は持たせない）
- `xx` は **base36 2文字**（`0-9a-z`）とする  
  - 例：`00, 01, 02, ... 09, 0a, 0b, ... 0z, 10, ...`
- 採番IDの正規表現：`^\d{6}[0-9a-z]{2}$`

### 性質
- 採番IDは **フォルダ名・公開ID**として扱う
- 個人運用につき、採番はローカルで完結してよい
- 採番し直し（廃番→再採番）を許容する（必要に応じて別途エイリアス対応を追加）

---

## フォルダ構成（1コンテンツ = 1フォルダ）

```

packages/3dss-content/library/ <YYMMDDxx>/
model.3dss.json
_meta.json        (任意：サイト都合の補助メタ)
_sources.md       (任意：出典メモ)
thumb.webp        (任意：サムネ)
_docs/
_README.md        (このファイル)
_CHEATSHEET.md    (任意：作業呪文の短縮表)

```

- コンテンツ本体は必ず `model.3dss.json`
- 管理ファイル／内部ドキュメントは混線防止のため **`_` 始まり**にする（任意）

---

## 公開（sync）のルール
SSOT（`packages/3dss-content`）は site 側へ同期される。

- 同期先：`apps/site/public/3dss/library/`
- ただし `library/` は **公開したくないものを除外**してコピーする  
  - 除外：`_` 始まりのフォルダ／ファイル（例：`_docs/`, `_meta.json`）  
  - 除外：`*.md`

→ `library/_docs/_README.md` は **public に出ない**（意図どおり）。

---

## 3DSS内メタ（最低限）
`model.3dss.json` の `document_meta` に最低限以下を持たせる。

- `id`：採番ID（例：`2601050a`）
- `title`
- `tags`（任意）
- `updated_at`（任意：更新表示に使う場合）

補足：
- `document_uuid` 等の固有UUIDは **別軸で持ってよい**（採番IDとは役割が違う）

---

## Library の棚（新着 / おすすめ）の責務分離
コンテンツ本体ではなく、サイト側の編集情報で棚を作る。

- `apps/site/public/library/editorial.json`  
  - `recommended`: おすすめ棚のID配列（編集順がそのまま表示順）
- `apps/site/public/library/library_index.json`（自動生成）  
  - 3DSSから抽出した一覧メタ（タイトル/要約/タグ/URL等）

※「新着」は動画サイトみたいなランキングではなく、**採番ID（=採番日）を基準にした並び**でよい。

---

## 作業呪文（運用コマンド）

### 1) 新規モデルを作る（採番＋雛形）
```

npm --prefix apps/site run new:library-item -- --title "仮タイトル"

```
生成先：
- `packages/3dss-content/library/<YYMMDDxx>/model.3dss.json`

### 2) 反映（同期＋index生成）
```

npm --prefix apps/site run sync:all

```

### 3) ライブラリ健全性チェック
```

npm --prefix apps/site run check:library

```

### 4) ID変更（廃番→再採番、単発）
```

npm --prefix apps/site run rename:library-id -- --from OLD --to NEW

```
（必要に応じて）`editorial.json` やスナップショット名も追従する。

---

## 生成スクリプトの前提
- インデックス生成は `**/*.3dss.json` のみをコンテンツとして走査する  
  → `_meta.json` や `_docs` は対象外
- 「おすすめ」は `editorial.json` がSSOT（編集棚）
- 「一覧メタ」は `library_index.json` がSSOT（自動生成）

---

## よくある注意
- `library/` に `_docs/` を置いてもOK。ただし **public に出ない**設定が有効であることを維持すること。
- 採番IDは「意味を持たせない」。タイトルや内容がドリフトしてもIDはそのままでよい。
- 「別作品」にしたい場合のみ新しい採番IDを発行する。
```
