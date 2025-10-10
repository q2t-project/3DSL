# Codex Spec Sheet for JavaScript
目的：この仕様書はJavaScriptコードをCodexに指示するための標準フォーマット。
ChatGPTは常にこの構成に準拠して出力する。

---

## 1. 概要（Task Overview）
- タスク種別：新規作成 / 修正 / 最適化 / デバッグ
- 対象範囲：関数 / クラス / モジュール / コンポーネント
- 目的：何を実現するか（例：「Three.jsでカメラのオートフィットを実装する」）

---

## 2. 入出力仕様（I/O Spec）
### 入力（Input）
| パラメータ名 | 型 | 説明 | 必須 |
|---------------|----|------|------|
|  |  |  |  |

### 出力（Output）
| 型 | 説明 |
|----|------|
|  |  |

※ 戻り値がPromiseの場合は明記（例：`Promise<Object>`）

---

## 3. 処理仕様（Logic / Flow）
1. 処理ステップの流れを段階的に列挙
2. 条件分岐・例外処理の説明
3. 主要な副作用（DOM操作・API通信・状態変更など）

---

## 4. 構造仕様（Structure）
- 使用フレームワーク／ランタイム（例：ESM / Node.js / Vite）
- import/export方針
- 命名規則（camelCase / PascalCase）
- コメントスタイル（JSDoc / inline）

例：
```js
// good
function getCameraFit(scene, margin = 1.2) { ... }
export default getCameraFit;
5. 関連仕様・依存関係（Dependencies）
内部依存：モジュール名 or ファイルパス

外部依存：npmパッケージやCDN（例：three, ajv, lodash）

グローバル参照：window, document, globalThis 等

6. エラー・例外処理（Error Handling）
想定されるエラー条件

エラー時の返却値またはthrow内容

ログ出力やUI通知方針

7. テスト仕様（Validation）
テスト対象：

テスト条件（入力／期待出力）：

例：

js
コードをコピーする
Input: [1, 2, 3]
Expected: 6
8. 非機能仕様（Non-Functional）
パフォーマンス要件（O(n), lazy load, async）

コーディング規約（ESLint / Prettierルール）

保守性（再利用想定の範囲）

9. 備考
参照元仕様書や関連関数

特記事項（例：「3DSSスキーマ準拠」など）

yaml
コードをコピーする

---