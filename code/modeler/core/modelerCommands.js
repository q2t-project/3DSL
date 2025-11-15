// modeler の高レベルコマンド群（Undo/Redo などは後で）

import { ModelerContext } from "./modelerContext.js";

export function createModelerContext() {
  return new ModelerContext();
}

/**
 * 新規ドキュメントを初期化する。
 * @param {ModelerContext} ctx
 */
export function newDocument(ctx) {
  ctx.document.lines = [];
  ctx.document.points = [];
  ctx.document.aux = [];
  ctx.markDirty();
}

/**
 * 既存 3DSS ドキュメントを開く（読み込みは別モジュール）。
 * @param {ModelerContext} ctx
 * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} doc
 */
export function openDocument(ctx, doc) {
  ctx.document = doc;
  ctx.markClean();
}
