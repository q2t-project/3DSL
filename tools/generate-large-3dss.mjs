// tools/generate-large-3dss.mjs
// 3DSS v1.0.1 向けの巨大サンプル生成スクリプト（ESM）
// - points / lines / aux を指定数だけ生成
// - position は unitless world 座標（units は mm 前提）
// - Z 座標もランダムで振る
// - 出力ファイルは UTF-8 で書き出し

import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

// ESM 版の「main 判定」
const __filename = fileURLToPath(import.meta.url);

// ------------------------------------------------------------
// ヘルパ
// ------------------------------------------------------------

function pad4(n) {
  return String(n).padStart(4, "0");
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// timestamp: スキーマの pattern に合わせてミリ秒を落とす
function isoUtcSeconds() {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

// ------------------------------------------------------------
// points 生成
// ------------------------------------------------------------

function createPoints(count) {
  const points = [];
  if (count <= 0) return points;

  // だいたい正方グリッドに並べる
  const side = Math.ceil(Math.sqrt(count)); // 一辺に並べる数
  const spacing = 10;                       // XY の間隔（units=mm 前提）
  const halfXY = (side - 1) * spacing * 0.5;

  // ★ Z も XY と同じくらいのレンジにする
  //    （必要なら zScale を 0.3 とかに落として調整してもOK）
  const zScale = 1.0;
  const zSpan = halfXY * zScale;

  let i = 0;
  for (let iy = 0; iy < side && i < count; iy++) {
    for (let ix = 0; ix < side && i < count; ix++, i++) {
      const x = -halfXY + ix * spacing;
      const y = -halfXY + iy * spacing;

      // ここを変更：[-zSpan, +zSpan] でランダム
      const z = randRange(-zSpan, zSpan);

      const uuid = randomUUID();
      points.push({
        signification: {
          name: `P${pad4(i)}`,
        },
        appearance: {
          position: [x, y, z],
          visible: true,
          frames: 0,
        },
        meta: {
          uuid,
          tags: ["s:sample"],
          creator_memo: "generated point",
        },
      });
    }
  }

  return points;
}


// ------------------------------------------------------------
// lines 生成
// ------------------------------------------------------------

function createLines(count, points) {
  const lines = [];
  const n = points.length;
  if (count <= 0 || n < 2) return lines;

  for (let i = 0; i < count; i++) {
    const ia = Math.floor(Math.random() * n);
    let ib;
    do {
      ib = Math.floor(Math.random() * n);
    } while (ib === ia);

    const uuidA = points[ia].meta.uuid;
    const uuidB = points[ib].meta.uuid;

    const lineUuid = randomUUID();

    lines.push({
      signification: {
        relation: {
          structural: "association",
        },
        sense: "a_to_b",
      },
      appearance: {
        end_a: { ref: uuidA },
        end_b: { ref: uuidB },
        line_type: "straight",
        line_style: "solid",
        color: "#ffffff",
        opacity: 0.4,
        renderOrder: 0,
        arrow: {
          shape: "cone",
          size: 2,
          aspect: 4,
          placement: "end_b",
          auto_orient: true,
        },
        effect: {
          effect_type: "none",
          amplitude: 1,
          speed: 1,
          duration: 1,
          loop: true,
          phase: 0,
          easing: "linear",
          width: 1,
        },
        visible: true,
        frames: 0,
      },
      meta: {
        uuid: lineUuid,
        tags: ["m:sample"],
        creator_memo: "generated line",
      },
    });
  }

  return lines;
}

// ------------------------------------------------------------
// aux 生成
// ------------------------------------------------------------

function createAux(count) {
  const aux = [];
  for (let i = 0; i < count; i++) {
    aux.push({
      appearance: {
        position: [0, 0, 0],
        orientation: [0, 0, 0],
        opacity: 0.4,
        module: {
          axis: {
            length: 64,
            labels: true,
            arrow: {
              enabled: true,
              size: 8,
              aspect: 2,
            },
          },
        },
        visible: true,
        frames: 0,
      },
      meta: {
        uuid: randomUUID(),
        tags: ["x:sample"],
        creator_memo: "generated aux",
      },
    });
  }
  return aux;
}

// ------------------------------------------------------------
// 3DSS ドキュメント生成本体
// ------------------------------------------------------------

export function generate3dss(pointsCount, linesCount, auxCount) {
  const points = createPoints(pointsCount);
  const lines = createLines(linesCount, points);
  const aux = createAux(auxCount);

  const doc = {
    document_meta: {
      document_uuid: randomUUID(),
      version: "1.0.0",
      updated_at: isoUtcSeconds(),
      tags: ["s:perf_sample"],
      schema_uri:
        "https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.1",
      generator: "https://q2t-project.github.io/3dsl/sample-generator",
      reference: "performance test sample",
      coordinate_system: "Z+up/freeXY",
      units: "mm",
      i18n: "ja",
      author: "perf.sample",
      creator_memo: "auto-generated large 3DSS sample",
    },
    points,
    lines,
    aux,
  };

  return doc;
}

// ------------------------------------------------------------
// CLI エントリ
//   node tools/generate-large-3dss.mjs 4000 8000 4 out.3dss.json
// ------------------------------------------------------------

if (process.argv[1] === __filename) {
  const [, , pointsArg, linesArg, auxArg, outPath] = process.argv;

  const pointsCount = Number.parseInt(pointsArg ?? "", 10) || 100;
  const linesCount = Number.parseInt(linesArg ?? "", 10) || 200;
  const auxCount = Number.parseInt(auxArg ?? "", 10) || 4;

  const doc = generate3dss(pointsCount, linesCount, auxCount);
  const json = JSON.stringify(doc, null, 2);

  if (outPath) {
    fs.writeFileSync(outPath, json, { encoding: "utf8" });
    // 一応ログだけ出しとく
    console.log(
      `[generate-large-3dss] wrote ${pointsCount} points / ${linesCount} lines / ${auxCount} aux → ${outPath}`,
    );
  } else {
    // パイプ出力したい場合
    process.stdout.write(json);
  }
}
