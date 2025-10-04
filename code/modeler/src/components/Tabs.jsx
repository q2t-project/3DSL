const tabs = [
  { key: 'nodes', label: 'Nodes' },
  { key: 'edges', label: 'Edges' },
  { key: 'texts', label: 'Texts' },
  { key: 'gltf', label: 'glTF' },
  { key: 'aux', label: 'Aux' }
];

function Tabs({ active, onChange }) {
  return (
    <div className="flex bg-gray-900 border-b border-gray-700 text-xs uppercase tracking-wide">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange?.(tab.key)}
          className={`px-4 py-2 font-semibold transition-colors ${
            active === tab.key
              ? 'bg-gray-800 text-white border-b-2 border-emerald-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
