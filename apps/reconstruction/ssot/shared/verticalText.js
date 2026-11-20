// Canvas 2D has no writing-mode. Build one vertical texture in its own plane
// before applying the 3DSS pose, so rotation moves the complete text.
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const upright = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}\u3000-\u303f\uff01-\uff60]/u;
const sidewaysPunctuation = new Set(Array.from("ー〜～‥…―—－（）〔〕［］｛｝〈〉《》「」『』【】〘〙〚〛"));
const cornerPunctuation = new Set(Array.from("、。，．"));

export function normalizeWritingMode(value) {
  return value === "vertical-rl" ? "vertical-rl" : "horizontal-tb";
}

export function measureVerticalText(ctx, text, fontPx, pad) {
  const cell = fontPx * 1.1;
  const columns = String(text).split(/\r\n|\r|\n/).map(line => {
    const graphemes = segmenter ? Array.from(segmenter.segment(line), part => part.segment) : Array.from(line);
    const runs = [];
    for (const glyph of graphemes) {
      const ch = Array.from(glyph)[0];
      if (sidewaysPunctuation.has(ch)) runs.push({ text: glyph, orientation: "sideways", fixed: true });
      else if (upright.test(glyph)) runs.push({ text: glyph, orientation: cornerPunctuation.has(ch) ? "corner" : "upright" });
      else {
        const last = runs.at(-1);
        if (last?.orientation === "sideways" && !last.fixed) last.text += glyph;
        else runs.push({ text: glyph, orientation: "sideways" });
      }
    }
    let cursor = 0;
    for (const run of runs) {
      const metrics = ctx.measureText(run.text);
      run.advance = run.orientation === "sideways" && !run.fixed ? metrics.width : cell;
      run.y = cursor + run.advance / 2;
      run.centerBaseline = (Number(metrics.actualBoundingBoxAscent ?? 0) - Number(metrics.actualBoundingBoxDescent ?? 0)) / 2;
      cursor += run.advance;
    }
    return { runs, advance: cursor };
  });
  const cw = Math.ceil(cell * columns.length + 2 * pad);
  const ch = Math.ceil(columns.reduce((max, column) => Math.max(max, column.advance), cell) + 2 * pad);
  return { columns, cell, pad, cw, ch, heightFactor: ch / (cell + 2 * pad) };
}

export function paintVerticalText(ctx, layout, { outline = false } = {}) {
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  layout.columns.forEach(({ runs }, index) => {
    const x = layout.pad + layout.cell * (layout.columns.length - index - 0.5);
    for (const run of runs) {
      ctx.save();
      const corner = run.orientation === "corner";
      ctx.translate(x + (corner ? layout.cell * 0.25 : 0), layout.pad + run.y - (corner ? layout.cell * 0.25 : 0));
      if (run.orientation === "sideways") ctx.rotate(Math.PI / 2);
      if (outline) ctx.strokeText(run.text, 0, run.centerBaseline);
      ctx.fillText(run.text, 0, run.centerBaseline);
      ctx.restore();
    }
  });
}
