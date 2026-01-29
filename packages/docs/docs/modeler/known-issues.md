# Known issues (Modeler)

このページは Public Alpha（M1）期間の暫定メモ。

## 起動・表示

- **ポップアップブロック**で「Preview Out」が開けない場合がある  
  - ブラウザのポップアップ許可をONにしてから再試行

- まれに **初回ロードで真っ黒**になることがある  
  - `Reload` で復帰することが多い

## 編集

- `Discard` は **未適用（Propertyのバッファ）**だけを破棄する  
  - すでに Apply 済みの変更を戻すには `Undo`

## 互換・拡張

- marker の高度な表現（例: glTF を含む複雑な外部アセット）は **Public Alphaでは未保証**  
  - Public Beta（M2）で互換範囲を確定する
