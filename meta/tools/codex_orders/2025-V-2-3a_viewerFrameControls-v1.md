Codex 指令書：viewer フレーム操作 v1 実装（V-2-2〜V-2-3 拡張版）
タイトル

2025-Phase2-viewerFrameControls-v1

対象ディレクトリ
/code/viewer/core/
/code/viewer/ui/
/code/viewer/renderer/

目的（必ず満たすこと）

viewer に 一次元 frame 操作（パラパラ漫画モデル） を正式実装する。

activeFrameId を viewerCore で一元管理

PageUp / PageDown / ホイール / Shift ジャンプ / Home(0) を実装

frame 切替時の 視覚ラチェット（HUDハイライト） を加える

音は完全不採用（追加禁止）

v1 は 一覧 UI / タイムライン UI / 2D frame を実装しない

将来拡張可能な構造を壊さない（コアは frame を整数のみ扱う）

修正対象ファイル一覧（Codex に明示）
1. /code/viewer/core/viewerCore.js

追加・修正すべき項目：

a) 状態管理として activeFrameId を導入

this.state = {
    activeFrameId: 0,
    // ※ 既存 state があれば共存させる
};


b) setter を追加

setActiveFrame(frameId) {
    if (typeof frameId !== 'number') return;
    this.state.activeFrameId = frameId;
    this.applyFrameToScene(frameId);
    this.notifyHUD(frameId);
}


c) フレーム適用ロジック

applyFrameToScene(frameId) {
    // points / lines / aux の visible 判定
    // appearance.frames が:
    // - number → その frameId と一致で表示
    // - array  → 含まれていれば表示
    // - 未定義 → 常に visible
}


d) HUD 連携

notifyHUD(frameId) {
    this.hud?.updateFrameIndicator(frameId);
}

2. /code/viewer/ui/viewerDevHarness.js

フレーム操作のキーバインドとホイール割り当てを追加

window.addEventListener("keydown", (e) => {
    const vm = this.viewerCore;
    const id = vm.state.activeFrameId;

    switch (e.key) {
        case "PageUp":
            vm.setActiveFrame(id + 1);
            break;

        case "PageDown":
            vm.setActiveFrame(id - 1);
            break;

        case "Home":
            vm.setActiveFrame(0);
            break;

        case "PageUp":
            if (e.shiftKey) vm.setActiveFrame(this.maxFrameId);
            break;

        case "PageDown":
            if (e.shiftKey) vm.setActiveFrame(this.minFrameId);
            break;
    }
});


ホイールで ±1

canvasEl.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY);  // 上= -1, 下= +1
    this.viewerCore.setActiveFrame(
        this.viewerCore.state.activeFrameId - delta
    );
}, { passive: false });

3. /code/viewer/ui/viewerHUD.js

HUD 上に Frame: N を表示する UI を追加

updateFrameIndicator(frameId) {
    const el = document.getElementById("hud-frame");
    if (!el) return;

    el.textContent = `Frame: ${frameId}`;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 120);
}


CSS（style セクション or CSS ファイル）

#hud-frame {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 8px;
    background: rgba(0,0,0,0.45);
    color: white;
    border-radius: 4px;
    font-size: 12px;
    transition: background 0.12s;
}

#hud-frame.flash {
    background: rgba(255,255,255,0.6);
    color: black;
}

新規 UI 要素追加（viewer_dev.html）

HUD 内に frame インジケータ：

<div id="hud-frame">Frame: 0</div>


既存 HUD ブロックがあるならそこに追加。
なければ <body> 直下に absolute で置く。

禁止事項（Codex に強制させる）

音声ファイルの追加禁止

AudioContext / HTMLAudioElement の使用禁止

2D frame マトリクス・タイムライン UI の実装禁止（v1では不要）

動作確認（selftest 仕様）

以下の条件を満たせば OK：

core_viewer_baseline.3dss.json を dev ハーネスで読み込む

PageUp → Frame:1
PageDown → Frame:0 に戻る

Shift+PageUp → 最大 frame
Shift+PageDown → 最小 frame

ホイール上下で ±1 切り替え

HUD が 120ms だけ白反転して「ラチェット感」が出る

AudioContext / Audio 要素が DOM に存在しない

フレーム切替によって points / lines / aux の visible が正しく変わる

最終アウトプットの期待値

viewerCore に setActiveFrame() が追加

デフォルト frame=0 に統一

キー＆ホイール操作が安定

視覚ラチェットが入る

音は完全排除

v1 の frame 操作仕様を満たす