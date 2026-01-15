// renderer/adapters/labelsCompat.js
//
// 目的: 旧 API / typo 互換を renderer 本体（labels/LabelLayer.js）から隔離する。
//
// NOTE:
// - 新規コードは `LabelLayer` を使用すること。
// - 互換が不要になったら、このファイルごと削除してよい。

import { LabelLayer } from "../labels/LabelLayer.js";

// 互換（typo の旧クラス名）
export class labelabelLayer extends LabelLayer {}
