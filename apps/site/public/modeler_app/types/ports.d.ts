// apps/modeler/ssot/types/ports.d.ts
// Modeler ports surface types (minimal, boundary-focused).
//
// Intent:
// - Freeze the hub/core/renderer surface shapes early, without converting the codebase to TS.
// - Keep types small and stable; expand only when a boundary needs it.

export type UUID = string;
export type Vec3 = [number, number, number];

export type NodeKind = "point" | "line" | "aux" | "unknown";

export interface PickHit {
  uuid: UUID;
  kind: NodeKind | string;
  distance: number;
  point: Vec3;
}

export type Unsubscribe = () => void;

export interface CoreDocumentPort {
  get(): unknown;
  set(doc: unknown, options?: { source?: string; label?: string }): void;
  update(mutator: (draft: any) => void, options?: { reason?: string }): void;
  getLabel(): string;
  setLabel(label: string): void;
}

export interface CoreFilePort {
  getBaseLabel(): string;
  getDisplayLabel(): string;
  getWindowTitle(): string;
  getSaveLabel(): string | null;
  setSaveLabel(label: string): void;
  clearSaveLabel(): void;
}

export interface CoreDirtyPort {
  get(): boolean;
  markDirty(reason?: string): void;
  markClean(reason?: string): void;
  set(v: boolean, reason?: string): void;
}

export interface CoreEditPort {
  updateDocument(mutator: (draft: any) => void, options?: { reason?: string }): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

export interface CoreSelectionPort {
  get(): UUID[];
  set(selection: UUID[], options?: { source?: string }): void;
}

export interface CoreLockPort {
  toggle(uuid: UUID): boolean;
  list(): UUID[];
}

export interface CoreUiStatePort {
  get(): any;
  set(next: any): void;
}

export interface QuickCheckIssue {
  code: string;
  level: "error" | "warning" | "info" | string;
  message: string;
  path?: string;
  refUuid?: UUID;
}

export interface CoreQuickCheckPort {
  run(): { ok: boolean; issues: QuickCheckIssue[] };
}

export interface StrictValidationResult {
  ok: boolean;
  errors: Array<{ instancePath?: string; keyword?: string; message?: string } | any>;
}

export interface CoreValidatorPort {
  ensureInitialized(schemaUrl?: string): Promise<void>;
  validate(doc?: unknown): StrictValidationResult;
  getErrors(): StrictValidationResult["errors"] | null;
  getSchemaInfo(): { $id: string | null; baseUri: string | null; version: string | null; major: number | null };
}

export interface CoreControllers {
  document: CoreDocumentPort;
  file: CoreFilePort;
  dirty: CoreDirtyPort;
  edit: CoreEditPort;
  selection: CoreSelectionPort;
  lock: CoreLockPort;
  uiState: CoreUiStatePort;
  quickcheck: CoreQuickCheckPort;
  validator: CoreValidatorPort;
  focusByIssue(issue: QuickCheckIssue): boolean;
}

export interface ModelerRenderer {
  start(): void;
  stop(): void;
  resize(width: number, height: number, dpr?: number): void;
  dispose(): void;
  setDocument(doc: unknown): void;
  pickObjectAt(ndcX: number, ndcY: number): PickHit | null;
}

export interface ModelerHub {
  core: CoreControllers;
  on(type: string, fn: (payload: any) => void): Unsubscribe;
  start(): void;
  stop(): void;
  dispose(): void;
  resize(width: number, height: number, dpr?: number): void;
  pickObjectAt(ndcX: number, ndcY: number): PickHit | null;
}
