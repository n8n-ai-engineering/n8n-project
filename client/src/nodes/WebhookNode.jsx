import React from 'react';
import { Handle, Position } from 'reactflow';
import { Webhook } from 'lucide-react';

export default function WebhookNode({ data, selected }) {
  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 px-5 py-4 min-w-[180px] shadow-lg transition-all ${
        selected ? 'border-violet-400 shadow-violet-900/40' : 'border-violet-700'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-900/60 flex items-center justify-center shrink-0">
          <Webhook size={16} className="text-violet-400" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Trigger</p>
          <p className="text-sm font-semibold text-slate-100">{data.label || 'Webhook'}</p>
        </div>
      </div>

      {data.url && (
        <div className="mt-2 px-2 py-1 bg-slate-900/60 rounded text-xs text-violet-300 font-mono truncate max-w-[200px]">
          POST /webhook
        </div>
      )}

      {/* Output handle — right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#a78bfa', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
