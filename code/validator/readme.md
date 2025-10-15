# code/validator/ の責務と位置づけ

# 詳細構造と責務分離：
code/validator/
 └─ validation-bridge.js

# 主目的：
/schemas/3DSS.schema.json に対する AJVベースのスキーマ検証を行う。
「構文的整合性（syntactic consistency）」のみをチェックし、意味的解釈（semantic validation）やUI連携は一切含まない。

## 呼び出し元：
viewer / modeler から呼び出される前提の「共通検証モジュール」
 viewer：表示前にデータ構造を検証する（表示エラー防止）
 modeler：保存前・送信前に構造整合性をチェックする

単体でもCLI検証に使えるが、あくまで 上位層の補助的存在。

## validation-bridge.js の役割：
「AJVインスタンス生成」＋「スキーマ読み込み」＋「検証結果の共通インターフェース化」。

## 擬似コード構造：

// validation-bridge.js
import Ajv from "../vendor/ajv/ajv2020.mjs";
import addFormats from "../vendor/ajv/formats.mjs";
import schema from "../../schemas/3DSS.schema.json" assert { type: "json" };

export function validate3DSS(data) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);
  return { valid, errors: validate.errors || [] };
}


→ viewer/modeler 双方から
import { validate3DSS } from "../validator/validation-bridge.js";
で呼び出し、UI層は結果を整形して表示する。
