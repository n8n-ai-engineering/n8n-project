import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export default function StartNode({ data, selected }) {
  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 px-5 py-4 min-w-[160px] shadow-lg transition-all ${
        selected ? 'border-emerald-400 shadow-emerald-900/40' : 'border-emerald-700'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-900/60 flex items-center justify-center shrink-0">
          <Play size={16} className="text-emerald-400 fill-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Trigger</p>
          <p className="text-sm font-semibold text-slate-100">{data.label || 'Start'}</p>
        </div>
      </div>

      {/* Output handle — right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#34d399', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
