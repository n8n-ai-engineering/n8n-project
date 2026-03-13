import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

export default function TelegramTriggerNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [expanded, setExpanded] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const updateData = useCallback(
    (field, value) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n))
      );
    },
    [id, setNodes]
  );

  const hasToken = !!(data.token || '').trim();

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[280px] shadow-lg transition-all ${
        selected ? 'border-cyan-400 shadow-cyan-900/40' : 'border-cyan-700'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-900/60 flex items-center justify-center shrink-0">
          {/* Telegram paper-plane icon via SVG */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cyan-400">
            <path
              d="M22 2L11 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 2L15 22L11 13L2 9L22 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Telegram Trigger</p>
          <p className="text-sm font-semibold text-slate-100 truncate">{data.label || 'Telegram Bot'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              hasToken
                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                : 'bg-slate-700 text-slate-500'
            }`}
          >
            {hasToken ? 'Token set' : 'No token'}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Bot Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 pr-8 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                placeholder="123456789:ABCdef..."
                value={data.token || ''}
                onChange={(e) => updateData('token', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Get a token from{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-500 hover:underline"
              >
                @BotFather
              </a>
            </p>
          </div>

          <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-2.5">
            <p className="text-xs text-cyan-400/80">
              When the workflow is <strong>Active</strong>, this node starts long-polling the bot.
              Each incoming message triggers the workflow. Output fields:{' '}
              <code className="text-cyan-300">text</code>,{' '}
              <code className="text-cyan-300">chat_id</code>,{' '}
              <code className="text-cyan-300">from</code>.
            </p>
          </div>
        </div>
      )}

      {/* Only a source handle — triggers have no incoming connection */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#22d3ee', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
