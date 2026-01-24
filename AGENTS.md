## Review guidelines

* SSOT（単一の真実）を壊す変更はNG。重複定義を増やさない。
* dist/public/vendor 等の「生成物/ミラー」は原則触らない（SSOT側を直す）。
* 既存の契約（viewer embed contract / DOM contract）を破る変更はP0扱いで指摘。
* 影響範囲が読めない大リネームは禁止。最小差分を優先。
* “とりあえず動く”の暫定コード（TODO乱立）は避ける。


# AGENTS.md (Agent Map)

目的: AI/人間が repo を迷わず操作するための地図。
※システム仕様SSOTそのものではない。SSOTの“場所”を指す。

## Public Routes（重要な決定のメモ）
- Viewer bundle base: `/viewer/`
- Viewer embed host: `/app/viewer`
- Modeler bundle base: `/modeler_app/`（※ 将来的に`/modeler/`へ移行。/modelerは現在Astro側のページで使用中）
- Modeler embed host: `/app/modeler`


## DO NOT AUTO-EDIT

- AGENTS.md は原則「人間が編集」。
- 変更案は AGENTS.proposed.md か差分で提示すること。


## Repo map (入口)

- apps/site: サイト（Astro）
- apps/viewer/ssot: ViewerのSSOT（runtime/core/ui/contracts）
- packages/3dss-content: ライブラリcontentとdist生成元
- packages/docs: 共有ドキュメント（契約/運用/ポリシー）
- packages/vendor or vendor: 共有vendor（three/ajv等）


## System SSOT (真実の場所)

- Schema SSOT: packages/schemas/3DSS.schema.json
- Viewer SSOT: apps/viewer/ssot/...
- Docs SSOT: packages/docs/...
- Content SSOT: packages/3dss-content/...


## Generated / mirrored (触るな)

- apps/site/public/\*\* は配布物（基本編集禁止、生成元を直す）
- apps/site/src/content/\*\* はミラーの可能性あり（編集元を確認）
- dist/public/vendor は生成物/ミラー扱い


## Commands (よく使う)

- dev: npm --prefix apps/site run dev
- build: npm --prefix apps/site run build
- sync:all / sync:viewer / sync:docs / sync:schemas / sync:3dss-content
- validate:3dss:canonical / fixtures / regression
- check:boundary / forbidden-import / guard(prebuild)


## Navigation docs (地図/索引)

- packages/docs/repo/README.md: 入口
- packages/docs/repo/MAP.md: 全体マップ
- packages/docs/repo/INDEX.md: 用語/逆引き索引
- packages/docs/repo/NAV_POLICY.md: 運用規範

---

## Review guidelines
- SSOT（単一の真実）を壊す変更はNG。重複定義を増やさない。
- dist/public/vendor 等の「生成物/ミラー」は原則触らない（SSOT側を直す）。
- 既存の契約（viewer embed contract / DOM contract）を破る変更はP0扱いで指摘。
- 影響範囲が読めない大リネームは禁止。最小差分を優先。
- “とりあえず動く”の暫定コード（TODO乱立）は避ける。
