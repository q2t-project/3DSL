## 起動フロー（viewer_dev.html → viewerDevHarness.js → viewerCore）

### 目的

- viewer の「開き方」を 1 パターンに固定し、  
  - 毎回同じ手順で初期化されること  
  - entry / harness / core の責務が混ざらないこと  
  を保証する。
- 以降の UI/UX 評価・不具合調査を「起動フローは一定」という前提で行えるようにする。

### 役割分担

- `viewer_dev.html`
  - 開発用エントリ HTML。
  - DOM（`<canvas>` / `<div>` など）を定義し、`viewerDevHarness.js` を読み込むだけに限定する。
  - 3DSS のロードや three.js 初期化ロジックは一切持たない。

- `viewerDevHarness.js`
  - 「ブラウザ環境」と「viewerCore」をつなぐ dev 専用ハーネス。
  - DOMContentLoaded 後に
    - DOM からコンテナ要素（canvas 等）を取得
    - 起動コンフィグを組み立て
    - viewerCore のブート関数を呼び出す
  - dev 固有の設定（ログ詳細度・使用する .3dss パスなど）はここで完結させる。

- `viewerCore`
  - viewer 本体のコアモジュール。
  - three.js 初期化・シーン構築・カメラ／コントロール設定・描画ループ・イベント登録など「表示エンジン」の責務を持つ。
  - DOM の取得は行わず、「コンテナ要素」と「設定オブジェクト」を引数で受け取るだけとする。
  - 本番ビルド時も同じ API をそのまま利用できるようにする。

### 起動シーケンス

1. ブラウザ起動
   - 開発時の起動手段は次のいずれかとする：
     - `viewer_dev.html` をブラウザで直接開く
     - `npm run dev` 等で dev サーバを起動し、`viewer_dev.html` にアクセスする
   - いずれの場合も、HTML のエントリは `viewer_dev.html` に統一する。

2. `viewer_dev.html` のロード
   - 必須要素：
     - viewer 用コンテナ（例：`<canvas id="viewer-canvas">` または `<div id="viewer-root">`）
     - dev ハーネス読み込み：
       ```html
       <script type="module" src="viewerDevHarness.js"></script>
       ```
   - `viewer_dev.html` はスタイル・フォント等の読み込みはしてもよいが、  
     JavaScript で viewerCore を直接 new したり、three.js を直接触ったりしてはならない。

3. DOMContentLoaded（ハーネス側）

   `viewerDevHarness.js` 側で、少なくとも次の処理を行う：

   1. DOM 準備待ち
      - `DOMContentLoaded`（または同等）イベントを待つ。

   2. コンテナ取得
      - `document.getElementById(...)` 等で viewer 用コンテナ要素を取得する。
      - 取得できなかった場合はエラーをログに出し、起動を中断する（※ UI 上の扱いは後続フェーズで検討）。

   3. 起動コンフィグの構築
      - 少なくとも次を含む設定オブジェクトを組み立てる：
        - `mode`: `"dev"`
        - `initial3dssPath`:
          - Phase 0 [C-0-2] で決めた基準ファイル  
            `/data/sample/core_viewer_baseline.3dss.json` を指す（相対 or 絶対パスは実装に合わせて決定）。
        - `logLevel`: `"debug"` 相当（dev 向け）
        - 将来的な拡張を想定したオプション（カメラ初期値、背景色など）

   4. viewerCore ブート呼び出し
      - viewerCore 側の公開 API を 1 本に揃える：
        - 例：`bootViewerCore(containerElement, config)` または  
          `createViewerCore({ container, config })`
      - DOM から取得したコンテナ要素とコンフィグを渡して呼び出す。

4. viewerCore 初期化

   viewerCore 内部の必須ステップを次の順番で統一する：

   1. three.js 基本セットアップ
      - renderer の生成（コンテナに紐づけ）
      - scene の生成
      - camera の生成
      - ライト等、最低限の環境要素の生成

   2. カメラ初期配置
      - 「core_viewer_baseline.3dss.json」を前提にした標準初期位置・向き・FOV を決め、固定値として設定する。
      - この時点ではまだ .3dss は読み込んでいなくてもよい。

   3. 3DSS ロード
      - `config.initial3dssPath` で指定された .3dss を fetch し、パースする。
      - スキーマ検証を viewer 内で行うかどうかは別途ポリシーで決めるが、
        少なくとも「パース不可」「必須トップレベル欠損」などの致命的エラーは検出してログに出す。

   4. シーン構築
      - 読み込んだ 3DSS に従い、scene 内に Object3D 群（points / lines / aux）を構築する。
      - このとき、後続フェーズでレイヤ ON/OFF を行いやすいよう、
        - `points` 用グループ
        - `lines` 用グループ
        - `aux` 用グループ
        をトップレベルに用意しておく（この段階では visible 制御はまだ必須ではない）。

   5. 描画ループ開始
      - requestAnimationFrame 等で連続描画ループを開始する。
      - ループ内で renderer.render(scene, camera) を呼ぶ。
      - OrbitControls 等のコントロールは Phase 2 [V-2-1] で本格導入するが、
        コールバックを差し込むフックだけは用意しておいてよい。

5. エラー処理の方針（最小限）

   - 起動フロー固定フェーズでは、UI 上のエラー表示は最小限とし、
     - コンソールログ
     - 将来の HUD ログ用のフック
     を用意するだけでよい。
   - 少なくとも次のケースでログを残す：
     - コンテナ要素が見つからない
     - `initial3dssPath` のロード失敗（HTTP エラー等）
     - JSON パースエラー

### エントリポイントに関する禁止事項

- viewerCore を new / boot するのは、開発時は **必ず** `viewerDevHarness.js` 経由とする。
  - `viewer_dev.html` から直接 viewerCore を呼び出さない。
  - 他の HTML / JS ファイルから独自に viewerCore を初期化しない（本番ビルド用の entry は、別途「ビルド構成」節で定義する）。
- viewerCore は DOM API（`document.getElementById` 等）を直接呼び出してはならない。
  - 必要な要素はすべて `viewerDevHarness.js` から引数として受け取る。
- 起動フローの順番（HTML → dev ハーネス → core）は、実装の都合で変更してはならない。
  - 変更が必要な場合は、仕様書側で起動フローを更新してから実装を変更する。