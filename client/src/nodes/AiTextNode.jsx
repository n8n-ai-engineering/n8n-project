import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';

export default function AiTextNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [expanded, setExpanded] = useState(false);

  const updatePrompt = useCallback(
    (value) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, prompt: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[260px] shadow-lg transition-all ${
        selected ? 'border-pink-400 shadow-pink-900/40' : 'border-pink-700'
      }`}
    >
      {/* Input handle — left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#f472b6', border: '2px solid #1e293b' }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-pink-900/60 flex items-center justify-center shrink-0">
          <BrainCircuit size={16} className="text-pink-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Action</p>
          <p className="text-sm font-semibold text-slate-100">{data.label || 'AI Text'}</p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </div>

      {/* Prompt preview when collapsed */}
      {!expanded && data.prompt && (
        <div className="px-4 pb-3">
          <p className="text-xs text-pink-300/60 truncate">{data.prompt}</p>
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3">
          <label className="block text-xs text-slate-400 mb-1 font-medium">Prompt</label>
          <textarea
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500 resize-none"
            placeholder="Enter your prompt here. Use {{input.field}} to reference input data."
            rows={4}
            value={data.prompt || ''}
            onChange={(e) => updatePrompt(e.target.value)}
          />
          <p className="text-xs text-slate-600 mt-1.5">
            Mock AI — swap engine.js for real OpenAI integration
          </p>
        </div>
      )}

      {/* Output handle — right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#f472b6', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
