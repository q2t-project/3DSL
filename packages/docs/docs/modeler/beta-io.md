# Public Beta (M2): iOS Safari / File I/O policy

## Save / Save As / Export の扱い（ブラウザ差の固定）
- **File System Access API が使える環境（Chrome / Edge など）**
  - **Save**: 直前の保存先へ上書き（ハンドル保持）
  - **Save As**: 保存先を選んで保存（ハンドル更新）
  - **Export**: 保存先を更新しない（退避用）。成功時は dirty を解消（方針）

- **File System Access API が使えない環境（例：iOS Safari）**
  - **Save**: ダウンロードとして出力（上書き保存はできない）
  - **Save As**: ダウンロードとして出力（ファイル名入力→ダウンロード）
  - **Export**: ダウンロードとして出力（退避用）。成功時は dirty を解消（方針）

## Preview Out（ポップアップ）詰み防止
- ポップアップがブロックされた場合、Modeler は **同一タブで Preview Out を開く代替**を提示する（confirm）。
- 代替で開いた場合はブラウザの「戻る」で Modeler に戻れる。
