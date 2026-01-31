# AGENTS.md 変更案（SSOT 連結の明確化）

AGENTS.md は「SSOTそのもの」ではなく「SSOTの場所を指す地図」なので、
SSOT_POLICY の“頂点”と modeler SSOT を、最小差分で追記する案。

## 追記案（最小）

### 1) Repo map (入口)

- `apps/modeler/ssot: ModelerのSSOT（spec/manifest/policy）`

### 2) System SSOT (真実の場所)

- `Project SSOT Policy: packages/docs/policy/SSOT_POLICY.md`
- `Modeler SSOT: apps/modeler/ssot/...`

---

※ viewer と modeler の app-local SSOT_POLICY.md は、上記 Project SSOT Policy を参照する前提。
