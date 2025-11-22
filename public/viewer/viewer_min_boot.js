// /viewer/viewer_min_boot.js
//   DOM と 3DSS と three.js をつなぐ「最小ブートストラップ」
import { initCore, startLoop } from "./viewer_min_core.js";
import { setupPoints, setupLines } from "./viewer_min_scene.js";
// ------------------------------------------------------------
// DOM 契約:
//   - #viewer-canvas が DOM 上に存在していること
//   - main() は DOMContentLoaded 後にだけ動く
// ------------------------------------------------------------
function getCanvasOrThrow() {
  const canvas = document.getElementById("viewer-canvas");
  if (!canvas) {
    throw new Error(
      "[min] canvas #viewer-canvas が見つからん。" +
        "DOM 生成前か id が変わってる。"
    );
  }
  return canvas;
}

async function main() {
  console.log("[min] start");

  const res = await fetch("../3dss/sample/demo.3dss.json", { cache: "no-cache" });
  const threeDSS = await res.json();
  console.log("[min] 3DSS loaded", threeDSS);
  const canvas = getCanvasOrThrow();
  const core = initCore(canvas);
  console.log("[min] core =", core);

  // 3DSS → three.js への写像（scene 側の責務）
  const pointPosByUUID = setupPoints(core, threeDSS);
  setupLines(core, threeDSS, pointPosByUUID);

  // three.js ループ開始（core 側の責務）
  startLoop(core);
}

// DOM が組み上がってから main() を叩くことで、
// 「canvas が必ず存在している」という前提を保証する。
window.addEventListener("DOMContentLoaded", () => {
  main().catch((err) => {
    console.error("[min] fatal", err);
  });
});