import { WORK_PACKAGE_MAX_BYTES } from '../modeler_app/runtime/workPackage.js';

// File.size is available without materializing the selected file's contents.
// Call before any read or draft/document mutation; keep parse-time limits too.
export function assertLocalFileSize(file) {
  if (!Number.isSafeInteger(file?.size) || file.size < 0) {
    throw new Error('ファイルの容量を確認できないため、読込みを中止しました。現在の作品は保持されています。');
  }
  if (file.size > WORK_PACKAGE_MAX_BYTES) {
    throw new Error('ファイルが32 MiBを超えています。読込みを中止しました。現在の作品は保持されています。');
  }
}
