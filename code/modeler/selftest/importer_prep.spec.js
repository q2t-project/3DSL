// code/modeler/selftest/importer_prep.spec.js

import test from 'node:test';
import assert from 'node:assert/strict';
// importer の実際のパスに合わせてここだけ調整してな
import { importFromPrep } from '../io/importer.js';

const { strictEqual, ok, match } = assert;

// ---------------------------------------------------------------------------
// 1) 現状のスタブ挙動（必ず失敗 + エラーメッセージ）
// ---------------------------------------------------------------------------
test('importFromPrep: currently returns a failure stub', () => {
  const result = importFromPrep({ some: 'prep-json' });

  strictEqual(typeof result, 'object');
  strictEqual(result.ok, false);

  ok(Array.isArray(result.errors), 'errors should be an array when ok=false');
  ok(result.errors.length > 0, 'errors array should not be empty');

  // 文字列はざっくり「not implemented」を含んでいることだけ見る
  match(String(result.errors[0]), /not implemented/i);
});

// ---------------------------------------------------------------------------
// 2) どんな入力でも例外を投げずに result を返す、という最低限の契約
// ---------------------------------------------------------------------------
test('importFromPrep: does not throw for arbitrary input', () => {
  const weirdInputs = [
    null,
    123,
    'plain text',
    [1, 2, 3],
    { foo: 'bar' },
  ];

  for (const input of weirdInputs) {
    let thrown = false;
    try {
      const res = importFromPrep(input);
      // 戻り値の形だけ軽くチェック
      strictEqual(typeof res, 'object');
      strictEqual(typeof res.ok, 'boolean');
    } catch {
      thrown = true;
    }
    strictEqual(thrown, false, 'importFromPrep should not throw');
  }
});
