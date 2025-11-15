# 3DSL Placeholder Images

このディレクトリは **仮置き画像（プレースホルダー）** を格納するための領域です。  
主に Codex の構造検証・Viewer／Modeler のUI配置テストに用いられます。

---

## 🧱 目的
- Codex が仕様書内の画像参照を解析する際、存在チェックを通過させるための仮素材を保持。
- UI／HUD／スプラッシュなどの「画像参照構造」を先行的に定義する。
- 実画像が未確定の段階でも `/assets/images/` の構成を維持する。

---

## 📂 構成
| ファイル名 | 用途 | 備考 |
|-------------|------|------|
| `dummy_splash.png` | Viewer／Modeler 共通スプラッシュ画面の仮素材 | 透過PNG、1024×512、中央に “3DSL Placeholder” ロゴ入り |

---

## 🪶 命名規則
用途_説明_v1.png

yaml
コードをコピーする
例：
- `dummy_splash.png`
- `placeholder_toolbar_ja.png`

---

## 🔄 差し替え運用
- 実際のデザインが確定したら、同名のファイルを上書き保存。
- Codex は **ファイル名が一致していれば構造を維持** し、差分報告を行わない。
- 古い仮素材を削除する場合は `/meta/update/` に「削除理由」を記録。

---

## ⚙️ Codex参照仕様
- `/specs/3DSD-viewer.md` → section 2.3 UI Structure（スプラッシュ参照）
- `/specs/3DSD-modeler.md` → section 1.1 Startup Layout
- `/repo_structure.txt` → assets/images/placeholders/ 登録済み

---

**Status:** ✅ Placeholder operational / 可視化テスト用素材として有効。