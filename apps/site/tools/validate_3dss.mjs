// tools/validate_3dss.mjs
// 3DSS v1.0.2 用のシンプルな CLI バリデータ

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// __dirname 相当
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 引数チェック
const [, , ...args] = process.argv;

if (args.length === 0) {
  console.error("Usage: node tools/validate_3dss.mjs <file1> [file2 ...]");
  process.exit(1);
}

// AJV 初期化（runtime_spec A-4 で決めた「勝手に直さない」系のオプション）
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictSchema: true,
  strictTypes: true,
  strictRequired: false,
  allowUnionTypes: true,
  removeAdditional: false,
  useDefaults: false,
  coerceTypes: false,
});

addFormats(ajv);

// スキーマ読み込み（必要ならパス調整）
// ここでは astro/public/schemas/3DSS.schema.json 前提
const schemaPath = path.resolve(__dirname, "../public/3dss/3dss/release/3DSS.schema.json");
const schemaJson = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schemaJson);

let hasError = false;

for (const relPath of args) {
  const filePath = path.resolve(process.cwd(), relPath);
  let data;

  try {
    const jsonText = fs.readFileSync(filePath, "utf8");
    data = JSON.parse(jsonText);
  } catch (e) {
    hasError = true;
    console.error(`[NG] ${relPath}`);
    console.error(`  - JSON 読み込み/パースに失敗: ${e.message}`);
    continue;
  }

  const ok = validate(data);

  if (ok) {
    console.log(`[OK] ${relPath}`);
  } else {
    hasError = true;
    console.error(`[NG] ${relPath}`);
    for (const err of validate.errors || []) {
      const where = err.instancePath || "(root)";
      console.error(`  - ${where} ${err.message}`);
      if (err.params) {
        console.error(`    params: ${JSON.stringify(err.params)}`);
      }
    }
  }
}

process.exit(hasError ? 1 : 0);
