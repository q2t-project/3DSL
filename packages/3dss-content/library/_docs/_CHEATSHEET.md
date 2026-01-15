# Library Ops Cheatsheet

## 新規モデル
npm --prefix apps/site run new:library-item -- --title "..."

## 反映
npm --prefix apps/site run sync:all

## チェック
npm --prefix apps/site run check:library

## ID変更
npm --prefix apps/site run rename:library-id -- --from OLD --to NEW
