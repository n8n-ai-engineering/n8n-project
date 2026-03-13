import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { ChevronDown, ChevronUp, Eye, EyeOff, Send } from 'lucide-react';

export default function TelegramActionNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [expanded, setExpanded] = useState(true);
  const [showToken, setShowToken] = useState(false);

  const updateData = useCallback(
    (field, value) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n))
      );
    },
    [id, setNodes]
  );

  const preview = data.message
    ? data.message.length > 40
      ? data.message.slice(0, 40) + '…'
      : data.message
    : null;

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[300px] shadow-lg transition-all ${
        selected ? 'border-cyan-400 shadow-cyan-900/40' : 'border-cyan-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#22d3ee', border: '2px solid #1e293b' }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-900/60 flex items-center justify-center shrink-0">
          <Send size={15} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Telegram Action</p>
          <p className="text-sm font-semibold text-slate-100 truncate">{data.label || 'Send Message'}</p>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-slate-400" />
        ) : (
          <ChevronDown size={14} className="text-slate-400" />
        )}
      </div>

      {!expanded && preview && (
        <div className="px-4 pb-3">
          <p className="text-xs text-cyan-300/50 truncate font-mono">{preview}</p>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3">
          {/* Bot Token */}
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
          </div>

          {/* Chat ID */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Chat ID
              <span className="ml-1.5 text-slate-600 font-normal">
                — use <code className="text-cyan-400/70">{'{{input.chat_id}}'}</code>
              </span>
            </label>
            <input
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 placeholder-slate-600"
              placeholder="{{input.chat_id}}"
              value={data.chatId || ''}
              onChange={(e) => updateData('chatId', e.target.value)}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Message
              <span className="ml-1.5 text-slate-600 font-normal">
                — use <code className="text-cyan-400/70">{'{{input.text}}'}</code>
              </span>
            </label>
            <textarea
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
              placeholder={'{{input.text}}'}
              rows={3}
              value={data.message || ''}
              onChange={(e) => updateData('message', e.target.value)}
            />
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#22d3ee', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
