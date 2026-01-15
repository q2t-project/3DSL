// viewer/ui/devHarnessControls.js
// Dev harness 用の UI 制御をまとめるためのモジュール。
// 現状の実装では attachUiProfile.js 側に集約しているため、このファイルは互換用の no-op とする。

/**
 * @returns {{detach: Function, dispose: Function}}
 */
export function attachDevHarnessControls() {
  const detach = () => {};
  return { detach, dispose: detach };
}
