import { useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import Tabs from './components/Tabs.jsx';
import SheetNodes from './components/SheetNodes.jsx';
import SheetEdges from './components/SheetEdges.jsx';
import SheetTexts from './components/SheetTexts.jsx';
import SheetGltf from './components/SheetGltf.jsx';
import SheetAux from './components/SheetAux.jsx';
import ValidationPanel from './components/ValidationPanel.jsx';
import Preview3D from './components/Preview3D.jsx';
import { applyDefaults, createEmptyModel, sceneDefaults } from './lib/defaults.js';
import { validateModel } from './lib/validator.js';
import { debounce, downloadBlob, readFileAsText } from './lib/utils.js';
import { exportSceneToGlb } from './lib/exportGlb.js';

const COLLECTIONS = ['nodes', 'edges', 'texts', 'gltf', 'aux'];

function buildErrorMap(errors = []) {
  const map = {
    nodes: {},
    edges: {},
    texts: {},
    gltf: {},
    aux: {}
  };
  errors.forEach((error) => {
    const instancePath = error.instancePath ?? '';
    if (!instancePath.startsWith('/')) return;
    const [collection, indexStr, ...rest] = instancePath.replace(/^\//, '').split('/');
    if (!COLLECTIONS.includes(collection)) return;
    const index = Number.parseInt(indexStr, 10);
    if (Number.isNaN(index)) return;
    const key = rest.join('/') || '_row';
    if (!map[collection][index]) {
      map[collection][index] = {};
    }
    map[collection][index][key] = true;
  });
  return map;
}

function createInitialState() {
  return applyDefaults(createEmptyModel());
}

function App() {
  const [model, setModel] = useState(() => createInitialState());
  const [activeTab, setActiveTab] = useState('nodes');
  const [selection, setSelection] = useState({
    nodes: [],
    edges: [],
    texts: [],
    gltf: [],
    aux: []
  });
  const [validation, setValidation] = useState({ valid: true, errors: [] });
  const validatorRef = useRef(debounce((data) => setValidation(validateModel(data)), 300));
  const sceneHandleRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    validatorRef.current(model);
  }, [model]);

  const errorMap = useMemo(() => buildErrorMap(validation.errors), [validation.errors]);

  const updateCollection = (key, rows) => {
    setModel((prev) => ({ ...prev, [key]: rows }));
  };

  const handleNew = () => {
    setModel(createInitialState());
    setSelection({ nodes: [], edges: [], texts: [], gltf: [], aux: [] });
  };

  const handleOpenFile = async (file) => {
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      const next = applyDefaults(parsed);
      setModel(next);
    } catch (error) {
      console.error(error);
      alert('Failed to load file: ' + error.message);
    }
  };

  const handleSave = () => {
    const json = JSON.stringify(model, null, 2);
    downloadBlob(json, 'model.json');
  };

  const handleImportUrl = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const next = applyDefaults(json);
      setModel(next);
    } catch (error) {
      console.error(error);
      alert('Failed to import: ' + error.message);
    }
  };

  const handleExportGlb = async () => {
    const scene = sceneHandleRef.current?.scene;
    if (!scene) {
      alert('Preview scene is not ready yet.');
      return;
    }
    try {
      await exportSceneToGlb(scene, 'model.glb');
    } catch (error) {
      console.error(error);
      alert('Failed to export glb: ' + error.message);
    }
  };

  const handlePreviewSelect = (type, index) => {
    if (!COLLECTIONS.includes(type)) return;
    setActiveTab(type);
    setSelection((prev) => ({ ...prev, [type]: [index] }));
  };

  const handleSceneReady = (handle) => {
    sceneHandleRef.current = handle;
  };

  const handleFocusPath = (path) => {
    if (!path) return;
    const [collection, indexStr] = path.replace(/^\//, '').split('/');
    if (!COLLECTIONS.includes(collection)) return;
    const index = Number.parseInt(indexStr, 10);
    if (!Number.isNaN(index)) {
      setSelection((prev) => ({ ...prev, [collection]: [index] }));
      setActiveTab(collection);
    }
  };

  const tabContext = useMemo(
    () => ({
      nodes: model.nodes,
      edges: model.edges,
      texts: model.texts,
      gltf: model.gltf,
      aux: model.aux
    }),
    [model]
  );

  const backgroundColor = model.background ?? sceneDefaults.background;

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      <TopBar
        onNew={handleNew}
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onExportGlb={handleExportGlb}
        onImportUrl={handleImportUrl}
        validation={validation}
      />
      <Tabs active={activeTab} onChange={setActiveTab} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden bg-gray-900">
          <div className="flex min-h-0 w-full flex-col overflow-hidden">
            {activeTab === 'nodes' && (
              <SheetNodes
                rows={model.nodes}
                onChange={(rows) => updateCollection('nodes', rows)}
                selection={selection.nodes}
                onSelectionChange={(indexes) =>
                  setSelection((prev) => ({ ...prev, nodes: indexes }))
                }
                errors={errorMap.nodes}
              />
            )}
            {activeTab === 'edges' && (
              <SheetEdges
                rows={model.edges}
                onChange={(rows) => updateCollection('edges', rows)}
                selection={selection.edges}
                onSelectionChange={(indexes) =>
                  setSelection((prev) => ({ ...prev, edges: indexes }))
                }
                errors={errorMap.edges}
                context={{ nodes: tabContext.nodes }}
              />
            )}
            {activeTab === 'texts' && (
              <SheetTexts
                rows={model.texts}
                onChange={(rows) => updateCollection('texts', rows)}
                selection={selection.texts}
                onSelectionChange={(indexes) =>
                  setSelection((prev) => ({ ...prev, texts: indexes }))
                }
                errors={errorMap.texts}
              />
            )}
            {activeTab === 'gltf' && (
              <SheetGltf
                rows={model.gltf}
                onChange={(rows) => updateCollection('gltf', rows)}
                selection={selection.gltf}
                onSelectionChange={(indexes) =>
                  setSelection((prev) => ({ ...prev, gltf: indexes }))
                }
                errors={errorMap.gltf}
                context={{ nodes: tabContext.nodes }}
              />
            )}
            {activeTab === 'aux' && (
              <SheetAux
                rows={model.aux}
                onChange={(rows) => updateCollection('aux', rows)}
                selection={selection.aux}
                onSelectionChange={(indexes) =>
                  setSelection((prev) => ({ ...prev, aux: indexes }))
                }
                errors={errorMap.aux}
              />
            )}
          </div>
        </div>

        {/**
         * ─────────────────────────────────────────────────────────────
         * Layout Layering Rationale
         * ─────────────────────────────────────────────────────────────
         * Edit tables dominate the canvas; the compact preview keeps
         * spatial awareness (“observe while editing”); validation sits
         * alongside as the correctness sentinel. A modal expansion lets
         * makers dive deeper (“expand when exploring”) without leaving
         * the editing posture — structure follows cognition.
         */}
        <div className="border-t border-gray-800 bg-gray-950/80 px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex min-h-[240px] flex-1 flex-col gap-3 rounded-lg border border-gray-800 bg-gray-900/80 p-3 lg:flex-[1.2]">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                <span>Spatial Preview</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    <span>Background</span>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(event) =>
                        setModel((prev) => ({ ...prev, background: event.target.value }))
                      }
                      className="h-6 w-12 cursor-pointer rounded border border-gray-700 bg-gray-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => previewRef.current?.openPopup()}
                    className="rounded-md bg-gray-800/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:bg-gray-700"
                  >
                    🔍 Full Preview
                  </button>
                </div>
              </div>
              <div className="h-[200px] overflow-hidden rounded-md border border-gray-800 bg-black">
                <Preview3D
                  ref={previewRef}
                  data={model}
                  selection={selection}
                  onSelect={handlePreviewSelect}
                  onSceneReady={handleSceneReady}
                  limitedControls
                  className="h-full"
                  enableFullPreview
                />
              </div>
            </div>
            <div className="flex min-h-[240px] flex-1 overflow-hidden rounded-lg border border-gray-800 lg:flex-[1]">
              <ValidationPanel validation={validation} onFocusPath={handleFocusPath} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;
