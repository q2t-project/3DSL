# Library Ops Cheatsheet

## 新規モデル
npm --prefix apps/site run new:library-item -- --title "..."

## 反映
npm --prefix apps/site run sync:all

## チェック
npm --prefix apps/site run check:library

## WIP→公開 手順書
packages/3dss-content/library/_docs/WIP_WORKFLOW.md

## `_meta.json` テンプレ
packages/3dss-content/library/_meta.json.template

## ID変更
npm --prefix apps/site run rename:library-id -- --from OLD --to NEW
