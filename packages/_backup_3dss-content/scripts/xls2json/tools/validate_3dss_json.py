#!/usr/bin/env python3
# Validate 3DSS json against 3DSS.schema.json (Draft 2020-12)
# Usage:
#   python validate_3dss_json.py in.3dss.json 3DSS.schema.json
import json, sys
from jsonschema import Draft202012Validator

def main():
    if len(sys.argv) < 2:
        print("Usage: python validate_3dss_json.py <3dss.json> [schema.json]")
        return 2
    json_path = sys.argv[1]
    schema_path = sys.argv[2] if len(sys.argv) >= 3 else "3DSS.schema.json"

    with open(schema_path, "r", encoding="utf-8-sig") as f:
        schema = json.load(f)
    with open(json_path, "r", encoding="utf-8-sig") as f:
        doc = json.load(f)

    v = Draft202012Validator(schema)
    errors = sorted(v.iter_errors(doc), key=lambda e: (list(e.path), e.message))

    if not errors:
        print("OK: schema-valid")
        return 0

    print(f"NG: {len(errors)} error(s)")
    for e in errors[:50]:
        path = "/" + "/".join(str(p) for p in e.path)
        print(f"- {path}: {e.message}")
    if len(errors) > 50:
        print(f"... and {len(errors)-50} more")
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
