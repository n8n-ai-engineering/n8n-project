import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';

export default function StorageNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [expanded, setExpanded] = useState(true);

  const updateData = useCallback(
    (field, value) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n))
      );
    },
    [id, setNodes]
  );

  const operation = data.operation || 'GET';

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[280px] shadow-lg transition-all ${
        selected ? 'border-orange-400 shadow-orange-900/40' : 'border-orange-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#fb923c', border: '2px solid #1e293b' }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-orange-900/60 flex items-center justify-center shrink-0">
          <Database size={15} className="text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Storage</p>
          <p className="text-sm font-semibold text-slate-100 truncate">{data.label || 'Key-Value Store'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
              operation === 'SET'
                ? 'bg-orange-900/40 text-orange-300 border border-orange-700/40'
                : 'bg-sky-900/40 text-sky-300 border border-sky-700/40'
            }`}
          >
            {operation}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </div>

      {!expanded && data.key && (
        <div className="px-4 pb-3">
          <p className="text-xs text-orange-300/50 truncate font-mono">{data.key}</p>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3">
          {/* Operation */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Operation</label>
            <select
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
              value={operation}
              onChange={(e) => updateData('operation', e.target.value)}
            >
              <option value="GET">GET — read a value</option>
              <option value="SET">SET — write a value</option>
            </select>
          </div>

          {/* Key */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Key
              <span className="ml-1.5 text-slate-600 font-normal">
                — supports <code className="text-orange-400/70">{'{{input.field}}'}</code>
              </span>
            </label>
            <input
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-orange-500 placeholder-slate-600"
              placeholder="my_key"
              value={data.key || ''}
              onChange={(e) => updateData('key', e.target.value)}
            />
          </div>

          {/* Value (only for SET) */}
          {operation === 'SET' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Value
                <span className="ml-1.5 text-slate-600 font-normal">
                  — supports <code className="text-orange-400/70">{'{{input.text}}'}</code>
                </span>
              </label>
              <input
                className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-orange-500 placeholder-slate-600"
                placeholder="{{input.text}}"
                value={data.value || ''}
                onChange={(e) => updateData('value', e.target.value)}
              />
            </div>
          )}

          <p className="text-xs text-slate-600">
            {operation === 'GET'
              ? 'Output: { operation, key, value }. Returns null if key not found.'
              : 'Output: { operation, key, value }. Persists across workflow runs.'}
          </p>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#fb923c', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
