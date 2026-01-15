#!/usr/bin/env python3
# csv_to_3dss.py
# Convert CSV(s) into 3DSS.json. Since CSV has no sheets, pass two files:
#   --points points.csv --lines lines.csv
#
# Expected CSV format:
#   Row 1: column keys (JSON paths like "appearance.pos[0]" or "meta.uuid")
#   Row 2..: data rows (1 element per row)
#
# For type coercion:
#   - numbers are parsed as float/int when possible
#   - "true/false" -> boolean
#   - columns ending with "_json" are parsed as JSON
#
import csv
import json
import re
import uuid
import datetime
import argparse
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional

try:
    import jsonschema
except Exception:
    jsonschema = None

ARRAY_IDX_RE = re.compile(r"^(?P<name>[^\[\]]+)(?:\[(?P<idx>\d+)\])?$")

def _parse_steps(key: str) -> List[Tuple[Optional[str], Optional[int]]]:
    steps: List[Tuple[Optional[str], Optional[int]]] = []
    for seg in key.split("."):
        m = ARRAY_IDX_RE.match(seg)
        if not m:
            steps.append((seg, None))
            continue
        name = m.group("name")
        idx = m.group("idx")
        steps.append((name, int(idx)) if idx is not None else (name, None))
    return steps

def _ensure_list_len(lst: List[Any], n: int) -> None:
    if len(lst) < n:
        lst.extend([None] * (n - len(lst)))

def _set_path(obj: Dict[str, Any], key: str, value: Any) -> None:
    steps = _parse_steps(key)
    cur: Any = obj
    for i, (name, idx) in enumerate(steps):
        is_last = (i == len(steps) - 1)
        if idx is None:
            if is_last:
                cur[name] = value
                return
            if name not in cur or not isinstance(cur[name], (dict, list)):
                nxt_name, nxt_idx = steps[i + 1]
                cur[name] = [] if nxt_idx is not None else {}
            cur = cur[name]
        else:
            if name not in cur or not isinstance(cur[name], list):
                cur[name] = []
            lst = cur[name]
            _ensure_list_len(lst, idx + 1)
            if is_last:
                lst[idx] = value
                return
            if lst[idx] is None or not isinstance(lst[idx], (dict, list)):
                nxt_name, nxt_idx = steps[i + 1]
                lst[idx] = [] if nxt_idx is not None else {}
            cur = lst[idx]

def _trim(obj: Any) -> Any:
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            v2 = _trim(v)
            if v2 is None:
                continue
            if isinstance(v2, dict) and not v2:
                continue
            if isinstance(v2, list) and len(v2) == 0:
                continue
            out[k] = v2
        return out
    if isinstance(obj, list):
        out = [_trim(v) for v in obj]
        while out and out[-1] is None:
            out.pop()
        if all(v is None for v in out):
            return []
        return out
    return obj

def _coerce(s: str, key: str) -> Any:
    if s is None:
        return None
    s = s.strip()
    if s == "":
        return None

    if key.endswith("_json"):
        try:
            return json.loads(s)
        except Exception:
            return s

    ls = s.lower()
    if ls in ("true", "false"):
        return ls == "true"

    # int?
    try:
        if re.fullmatch(r"[+-]?\d+", s):
            return int(s)
    except Exception:
        pass

    # float?
    try:
        if re.fullmatch(r"[+-]?\d+(\.\d+)?([eE][+-]?\d+)?", s):
            return float(s)
    except Exception:
        pass

    return s

def _read_csv(path: Optional[str]) -> List[Dict[str, Any]]:
    if not path:
        return []
    p = Path(path)
    if not p.exists():
        return []
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)
    if not rows:
        return []

    keys = [k.strip() for k in rows[0]]
    out: List[Dict[str, Any]] = []
    for r in rows[1:]:
        obj: Dict[str, Any] = {}
        any_value = False
        for key, cell in zip(keys, r):
            if not key:
                continue
            v = _coerce(cell, key)
            if v is None:
                continue
            any_value = True
            _set_path(obj, key, v)
        if not any_value:
            continue
        obj = _trim(obj)
        meta = obj.get("meta")
        if isinstance(meta, dict) and not meta.get("uuid"):
            meta["uuid"] = str(uuid.uuid4())
        elif meta is None:
            obj["meta"] = {"uuid": str(uuid.uuid4())}
        out.append(obj)
    return out

def _default_document_meta(schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    schema_uri = "https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.3"
    if schema and isinstance(schema, dict):
        sid = schema.get("$id") or ""
        anch = schema.get("$anchor") or ""
        if sid:
            base = sid[:-1] if sid.endswith("#") else sid
            schema_uri = f"{base}#{anch}" if anch else base
    return {
        "document_title": "Untitled",
        "document_uuid": str(uuid.uuid4()),
        "schema_uri": schema_uri,
        "author": "unknown",
        "version": "1.0.0",
        "updated_at": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--points", required=False, help="points.csv")
    ap.add_argument("--lines", required=False, help="lines.csv")
    ap.add_argument("--out", required=True, help="Output .json")
    ap.add_argument("--schema", default=None, help="Optional 3DSS.schema.json to validate output")
    ap.add_argument("--meta-json", default=None, help="Optional JSON file containing document_meta object")
    ap.add_argument("--no-validate", action="store_true")
    args = ap.parse_args()

    schema = None
    if args.schema:
        schema = json.loads(Path(args.schema).read_text(encoding="utf-8"))

    points = _read_csv(args.points)
    lines = _read_csv(args.lines)

    if args.meta_json:
        document_meta = json.loads(Path(args.meta_json).read_text(encoding="utf-8"))
    else:
        document_meta = _default_document_meta(schema)

    doc = {"document_meta": document_meta, "points": points, "lines": lines}
    Path(args.out).write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.schema and not args.no_validate and jsonschema is not None:
        try:
            jsonschema.validate(instance=doc, schema=schema)
        except Exception as e:
            raise SystemExit(f"[validate] FAILED: {e}")
        print("[validate] OK")

    print(f"[write] {args.out} (points={len(points)} lines={len(lines)})")

if __name__ == "__main__":
    main()
