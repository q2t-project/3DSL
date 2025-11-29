



# 3DSL Viewer: microFX データフロー最終版（2025-11-30）

## 1. Selection → microState

- 真実の selection:
  - `uiState.selection: null | { kind: "points"|"lines"|"aux", uuid: string }`
- API:
  - `selectionController.select(uuid, kind?)`
  - `selectionController.get() -> uiState.selection`
- kind 解決:
  - 明示指定があればそれを採用
  - 無ければ `indices.uuidToKind` から推定

- microState 計算:
  - `microController.compute(selection, cameraState, document3dss, indices)`
  - 戻り値:
    ```ts
    type MicroState = {
      focusUuid: string
      kind: "points" | "lines" | "aux"
      focusPosition: [number, number, number]
      relatedUuids: string[]
      localBounds: { center: [x,y,z], size: [sx,sy,sz] } | null
      localAxes?: { origin: [x,y,z], xDir?, yDir?, zDir?, scale? }
      graphLayers?: string[][]
      degreeByUuid?: Record<string, number>
      isHover?: boolean
      editing?: boolean
    }
    ```
  - 保管場所: `uiState.microState`

## 2. モードと microState の契約

- モード:
  - `uiState.mode: "macro" | "meso" | "micro"`
- `modeController.set(mode, uuid?)`:
  - `"macro"`:
    - `uiState.mode = "macro"`
    - `uiState.microState = null`
  - `"meso"`:
    - selection のみ更新
    - `uiState.microState = null`
  - `"micro"`:
    - selection 更新
    - `microController.compute(...)` で `uiState.microState` を更新
    - 失敗時は `"macro"` にフォールバック
- `modeController.exit()`:
  - `set("macro")` の単なる別名

## 3. render パス

- `cameraEngine.getState() -> cameraState`
- viewerHub 内レンダーループ:
  ```js
  const camState = cameraEngine.getState();

  renderer.updateCamera(camState);
  renderer.applyFrame(core.uiState.visibleSet);
  renderer.applySelection(core.uiState.selection);

  const microState =
    core.uiState.mode === "micro"
      ? core.uiState.microState
      : null;

  renderer.applyMicroFX(microState, camState);
  renderer.render();
