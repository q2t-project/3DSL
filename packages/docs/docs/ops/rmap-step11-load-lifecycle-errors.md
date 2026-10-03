# RMAP STEP 11 — Load Lifecycle + Negative-Path Closure Slice

Status: `IMPLEMENTED / CI_PENDING`

Parent:
`STEP11_RELEASE1_MOBILE_AND_END_TO_END_ACCEPTANCE_AUTOMATED_PASS`

## Purpose

Close the remaining Milestone 1 model-loading/error-handling contract between:

```text
/app/viewer
  ↓ iframe
/viewer/index.html
  ↓
Viewer host/runtime
```

The outer product host already listened for:

- `3dsl.viewer.loadStart`
- `3dsl.viewer.loadOk`
- `3dsl.viewer.loadFail`
- `3dsl.viewer.hostReady`

but the inner Viewer did not emit that lifecycle.

## Repair

The inner Viewer now reports:

```text
remount start
→ loadStart
→ mount
   ├─ success → loadOk
   └─ failure → loadFail(message)

initial successful mount
→ hostReady
```

The outer host now shows load failure even for the initial Library launch.
Failure visibility no longer depends on a user-initiated `loadToastArmed` state.

## Preserved distinctions

```text
HTML iframe load != Viewer runtime ready
Viewer runtime ready != model semantically correct
load failure != schema redesign requirement
guide failure != model load failure
```

Typed bootstrap failures remain:
- `FETCH_ERROR`
- `JSON_ERROR`
- `VALIDATION_ERROR`
- existing ref-integrity failures

## Acceptance

The Release 1 E2E check now verifies:

1. inner SSOT contains all four lifecycle messages;
2. initial mount emits `hostReady`;
3. outer host has an unconditional visible `loadFail` path;
4. bootstrap retains typed fetch/JSON/validation failures;
5. built/synced `/viewer/viewerHostBoot.js` contains the lifecycle contract.

No new dependency.

## Non-scope

- no 3DSS schema change;
- no Viewer rendering rewrite;
- no Library metadata format change;
- no Premium/Modeler work;
- no claim of real-device visual quality or reader comprehension.

## Target result

`STEP11_LOAD_LIFECYCLE_AND_ERROR_HANDLING_SLICE_PASS`
