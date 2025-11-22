// ============================================================
// state.js
// 3DSS JSON → viewer 用 State（純粋データ）へ変換
// three.js 非依存・immutable・軽結合
// ============================================================

// ------------------------------------------------------------
// エントリポイント
// ------------------------------------------------------------
export function buildState(json) {
    return {
        points: buildPoints(json),
        lines: buildLines(json),
        aux: buildAux(json),
        meta: buildMeta(json)
    };
}

// ============================================================
// points : {id, x, y, z, color, opacity, renderOrder}
// ============================================================

function buildPoints(json) {
    if (!json.points || !Array.isArray(json.points)) return [];

    return json.points.map(p => {
        const app = p.appearance ?? {};

        return {
            id: p.id,
            x: app.position?.x ?? 0,
            y: app.position?.y ?? 0,
            z: app.position?.z ?? 0,
            color: app.color ?? "#ffffff",
            opacity: app.opacity ?? 1.0,
            renderOrder: app.renderOrder ?? 0
        };
    });
}

// ============================================================
// lines : end_a / end_b を座標に展開
// ============================================================

function buildLines(json) {
    if (!json.lines || !Array.isArray(json.lines)) return [];
    if (!json.points) return [];

    // point ID → coords の辞書
    const pointDict = {};
    json.points.forEach(p => {
        const app = p.appearance ?? {};
        pointDict[p.id] = {
            x: app.position?.x ?? 0,
            y: app.position?.y ?? 0,
            z: app.position?.z ?? 0,
        };
    });

    return json.lines.map(l => {
        const app = l.appearance ?? {};
        const endA = pointDict[app.end_a?.ref] ?? { x: 0, y: 0, z: 0 };
        const endB = pointDict[app.end_b?.ref] ?? { x: 0, y: 0, z: 0 };

        return {
            id: l.id,
            a: endA,
            b: endB,
            color: app.color ?? "#ffffff",
            opacity: app.opacity ?? 1.0,
            lineType: app.line_type ?? "straight",
            renderOrder: app.renderOrder ?? 0,
            arrow: {
                a: app.arrow?.a ?? false,
                b: app.arrow?.b ?? false
            }
        };
    });
}

// ============================================================
// aux : 補助モジュール（外観層のみ）
// ============================================================

function buildAux(json) {
    if (!json.aux || !Array.isArray(json.aux)) return [];

    return json.aux.map(a => {
        const app = a.appearance ?? {};

        return {
            id: a.id,
            type: app.module ?? "unknown",
            position: {
                x: app.position?.x ?? 0,
                y: app.position?.y ?? 0,
                z: app.position?.z ?? 0
            },
            orientation: {
                x: app.orientation?.x ?? 0,
                y: app.orientation?.y ?? 0,
                z: app.orientation?.z ?? 0
            },
            opacity: app.opacity ?? 1.0,
            color: app.color ?? "#ffffff",
            params: app.params ?? {}
        };
    });
}

// ============================================================
// meta : viewer が必要とする最小セット
// ============================================================

function buildMeta(json) {
    const m = json.document_meta ?? {};

    // frame 情報の抽出（なければ 0–0）
    const f = m.frames ?? {};
    let min = 0, max = 0;

    if (typeof f.min === "number") min = f.min;
    if (typeof f.max === "number") max = f.max;

    return {
        name: m.name ?? "",
        version: m.version ?? "",
        frame: {
            min,
            max,
            current: min
        }
    };
}
