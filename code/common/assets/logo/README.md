# 3DSL ロゴリソース

このディレクトリには、3DSL 各アプリ（Viewer／Modeler）のロゴ SVG ファイルを格納している。

---

## 📁 ファイル構成
/assets/logo/
├── 3DSD-viewer.svg
└── 3DSD-modeler.svg

php-template
コードをコピーする

両者は同一仕様で、アプリ名部分（viewer／modeler）のみ異なる。

---

## 🧩 フォント仕様

| 部分 | フォント名 | 種類 | 役割 |
|------|-------------|------|------|
| 前段（3DSD） | [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) | Google Fonts | 太字・塊感のあるタイトル部 |
| 後段（Viewer／Modeler） | [Inter Tight](https://fonts.google.com/specimen/Inter+Tight) | Google Fonts | 読みやすくバランスの取れた本文部 |

両フォントは **SIL Open Font License 1.1** に準拠しており、商用利用・再配布ともに可能。

---

## 🧱 SVG構造概要

例：`3DSD-Modeler.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Inter+Tight:wght@500&amp;display=swap');
      text { dominant-baseline: bottom; text-anchor: middle; fill: #111; }
      .head { font-family: 'Bebas Neue', sans-serif; font-size: 80px; letter-spacing: 1px; font-weight: 1000; }
      .tail { font-family: 'Inter Tight', sans-serif; font-size: 56px; font-weight: 500; }
    </style>
  </defs>
  <text x="50%" y="50%">
    <tspan class="head">3DSD</tspan>
    <tspan class="tail">modeler</tspan>
  </text>
</svg>
🎨 デザイン方針
外枠・背景なし、文字のみのシンプル構成

ベースカラー：#111（黒）

縦横比：640×160（viewBox="0 0 640 160"）

スケールは自由（width / height で調整可）

⚙️ 使用ガイド
開発／プレビュー用途
HTML へ直接埋め込み可能：

html
コードをコピーする
<img src="/assets/logo/3DSD-viewer.svg" width="240" alt="3DSD Viewer Logo">
配布・配信用途
必要に応じて Inkscape 等で パス化版（アウトライン化） を生成し、

/assets/logo/3dsd-viewer_outline.svg 等として格納。

パス化すればフォント依存がなくなり、環境差を完全排除できる。

📄 ライセンス
Bebas Neue / Inter Tight

Licensed under the SIL Open Font License 1.1.

SVG ファイル自体は 3DSL プロジェクト資産として MIT ライセンス下で扱う。