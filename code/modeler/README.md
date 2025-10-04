# 3DSD Modeler
 
-このフォルダは 3DSL リポジトリ初期化用の雛形です。
React + Vite + Tailwind ベースの 3DSD Modeler 実装です。3DSS 準拠 JSON をスプレッドシート風 UI と three.js プレビューで編集できます。

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

## 主な機能

- nodes / edges / texts / gltf / aux のタブ切り替えスプレッドシート編集
- 必須セルハイライト、enum ドロップダウン、行追加・削除、複数選択コピー & ペースト
- ホイール / 矢印キーによる数値アシスト、フォントサイズ 2^n ステップ制御
- Ajv 2020 によるリアルタイムスキーマ検証とエラー一覧
- three.js プレビュー (OrbitControls / レイヤ順序 / Raycaster 連動ハイライト)
- JSON 新規作成・読込・保存、glTF (.glb) エクスポート

## ショートカット / 操作

- `Ctrl/Cmd + C` : 選択行コピー
- `Ctrl/Cmd + V` : 選択行ペースト
- `Delete` / `Backspace` : 選択行削除
- ホイール: ±1、`Shift` + ホイール: ±10、`Alt` + ホイール: ±0.1
- `Arrow` キー: ±1、`Shift`: ±10、`Alt`: ±0.1
- 座標列選択時: `←/→` で X、`↑/↓` で Y、`PageUp/PageDown` で Z を調整
- texts.size 列: ホイールで 2 の累乗ステップ、`Alt` + ホイールで ±1 微調整

## サンプル

`src/sample/sample_small.json` に 3DSS 準拠の最小サンプルを同梱しています。`Load JSON` から読み込んで挙動を確認できます。
