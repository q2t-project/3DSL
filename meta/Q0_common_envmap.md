# Q0-02 共通環境変数・パス定義（sharedspec §2.2 準拠）

| 変数名 | 既定値 | 用途 |
|--------|--------|------|
| `MODE` | `"local"` | 実行モード：`local`／`codex`／`web` |
| `DATA_DIR` | `/data/` | 入出力ディレクトリ |
| `LOG_DIR` | `/logs/runtime/` | ランタイムログ保存パス |
| `CACHE_DIR` | `/cache/` | 異常終了時一時退避先 |
| `VALIDATOR_PATH` | `/code/common/validator_core.js` | 共通Validator参照先 |
| `CODEX_SPEC_PATH` | `/specs/3DSD_sharedspec.md` | Codex展開仕様参照先 |
| `PROTO_PATH` | `/proto/` | Codex生成コード出力先 |
