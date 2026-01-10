## Review guidelines
- SSOT（単一の真実）を壊す変更はNG。重複定義を増やさない。
- dist/public/vendor 等の「生成物/ミラー」は原則触らない（SSOT側を直す）。
- 既存の契約（viewer embed contract / DOM contract）を破る変更はP0扱いで指摘。
- 影響範囲が読めない大リネームは禁止。最小差分を優先。
- “とりあえず動く”の暫定コード（TODO乱立）は避ける。

