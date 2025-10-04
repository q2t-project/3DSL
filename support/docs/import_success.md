# Import 成功事例（three.js / ajv）

本ドキュメントは、3DSD-viewer / modeler の実装において three.js および ajv を正しく import するための知見をまとめたものである。  
Codex に渡すことで import 設定を安定化させることを目的とする。

---

## 1. three.js の import

### 失敗例
```html
<script type="module">
  import * as THREE from "three";
</script>

- エラー: Uncaught TypeError: Failed to resolve module specifier "three"
- 原因: ブラウザ環境では Node.js 風の bare import specifier は解決されない

### 成功例
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/examples/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>

<script type="module">
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/controls/OrbitControls.js";
</script>

---

## 2. ajv の import
### 失敗例

<script type="module">
  import Ajv from "ajv";
</script>

- エラー: Uncaught TypeError: Failed to resolve module specifier "ajv"
### 成功例

<script type="importmap">
{
  "imports": {
    "ajv": "https://cdn.jsdelivr.net/npm/ajv@8.12.0/dist/ajv2020.min.js"
  }
}
</script>

<script type="module">
  import Ajv from "ajv";
  const ajv = new Ajv({ strict: false });
</script>

ポイント
- ajv/dist/ajv2020.min.js をマッピングすることでブラウザでの利用が可能
- strict モードはオプション、ここでは緩和して利用

---

## 3. 運用指針

- importmap を必ず導入すること
→ three.js, ajv はどちらも bare import specifier を使うため、CDN URL による解決が必要
- CDN は jsDelivr を標準とする（バージョンは固定して書くことを推奨）
- 仕様書と併せて Codex に渡すことで、正しい import 設定を反映した index.html を生成できる
