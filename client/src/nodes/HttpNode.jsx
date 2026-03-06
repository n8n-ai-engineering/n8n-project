import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Globe, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_COLORS = {
  GET: 'text-emerald-400 bg-emerald-900/40',
  POST: 'text-sky-400 bg-sky-900/40',
  PUT: 'text-amber-400 bg-amber-900/40',
  PATCH: 'text-violet-400 bg-violet-900/40',
  DELETE: 'text-red-400 bg-red-900/40',
};

export default function HttpNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [expanded, setExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState('');

  const updateData = useCallback(
    (field, value) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiMsg('');
    try {
      const { data: cfg } = await axios.post('/api/ai-config', { prompt: aiPrompt });
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  url: cfg.url || n.data.url,
                  method: cfg.method || n.data.method,
                  headers: cfg.headers || n.data.headers,
                  body: cfg.body || n.data.body,
                },
              }
            : n
        )
      );
      setAiMsg(cfg.description || 'Config applied!');
    } catch {
      setAiMsg('AI request failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, id, setNodes]);

  const urlDisplay = data.url
    ? data.url.length > 30
      ? data.url.slice(0, 30) + '…'
      : data.url
    : 'No URL set';

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[280px] shadow-lg transition-all ${
        selected ? 'border-sky-400 shadow-sky-900/40' : 'border-sky-700'
      }`}
    >
      {/* Input handle — left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#38bdf8', border: '2px solid #1e293b' }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-sky-900/60 flex items-center justify-center shrink-0">
          <Globe size={16} className="text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Action</p>
          <p className="text-sm font-semibold text-slate-100">{data.label || 'HTTP Request'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${METHOD_COLORS[data.method] || METHOD_COLORS.GET}`}>
            {data.method || 'GET'}
          </span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* URL preview when collapsed */}
      {!expanded && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-400 font-mono truncate">{urlDisplay}</p>
        </div>
      )}

      {/* Expanded settings */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
          {/* URL */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">URL</label>
            <input
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
              placeholder="https://api.example.com/endpoint"
              value={data.url || ''}
              onChange={(e) => updateData('url', e.target.value)}
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Method</label>
            <select
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              value={data.method || 'GET'}
              onChange={(e) => updateData('method', e.target.value)}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Headers */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Headers (JSON)</label>
            <textarea
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
              placeholder='{"Authorization": "Bearer token"}'
              rows={2}
              value={data.headers || '{}'}
              onChange={(e) => updateData('headers', e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Body (JSON)</label>
            <textarea
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
              placeholder='{"key": "value"}'
              rows={3}
              value={data.body || ''}
              onChange={(e) => updateData('body', e.target.value)}
            />
          </div>

          {/* AI Config */}
          <div className="border-t border-slate-700 pt-3">
            <label className="block text-xs text-slate-400 mb-1 font-medium flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              Ask AI to configure
            </label>
            <div className="flex gap-2">
              <input
                className="nodrag flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                placeholder="e.g. get weather for Moscow"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
              />
              <button
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                Generate
              </button>
            </div>
            {aiMsg && (
              <p className="text-xs text-amber-400 mt-1 font-medium">{aiMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* Output handle — right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#38bdf8', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
