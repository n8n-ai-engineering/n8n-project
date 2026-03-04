import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Code2, ChevronDown, ChevronUp } from 'lucide-react';

const DEFAULT_CODE = `// Access previous node output via \`input\`
// Example: input.data.temperature
return { result: input };`;

export default function CodeNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [expanded, setExpanded] = useState(false);

  const updateCode = useCallback(
    (value) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, code: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  const lineCount = (data.code || DEFAULT_CODE).split('\n').length;

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[280px] shadow-lg transition-all ${
        selected ? 'border-amber-400 shadow-amber-900/40' : 'border-amber-700'
      }`}
    >
      {/* Input handle — left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#fbbf24', border: '2px solid #1e293b' }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-amber-900/60 flex items-center justify-center shrink-0">
          <Code2 size={16} className="text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Action</p>
          <p className="text-sm font-semibold text-slate-100">{data.label || 'Code (JS)'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{lineCount} lines</span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* Code preview when collapsed */}
      {!expanded && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-300/60 font-mono truncate">
            {(data.code || DEFAULT_CODE).split('\n').find((l) => l.trim() && !l.trim().startsWith('//'))}
          </p>
        </div>
      )}

      {/* Expanded code editor */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3">
          <label className="block text-xs text-slate-400 mb-2 font-medium">
            JavaScript Code
          </label>
          <div className="relative">
            <textarea
              className="w-full bg-slate-950 border border-slate-600 rounded-lg px-3 py-2.5 text-xs text-amber-100 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-y min-h-[140px]"
              placeholder={DEFAULT_CODE}
              value={data.code || ''}
              onChange={(e) => updateCode(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="mt-2 p-2 bg-slate-900/60 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-500 font-mono">
              <span className="text-slate-400">Available:</span>{' '}
              <span className="text-amber-400">input</span>{' · '}
              <span className="text-amber-400">console</span>{' · '}
              <span className="text-amber-400">axios</span>
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Use <code className="text-amber-400">return {'{'} ... {'}'}</code> to pass data to the next node
            </p>
          </div>
        </div>
      )}

      {/* Output handle — right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#fbbf24', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
