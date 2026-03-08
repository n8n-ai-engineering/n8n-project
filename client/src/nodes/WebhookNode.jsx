import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useParams } from 'react-router-dom';
import { Webhook, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export default function WebhookNode({ data, selected }) {
  const { id: workflowId } = useParams();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = workflowId
    ? `http://${window.location.hostname}:3001/webhook/${workflowId}`
    : '(save workflow to get URL)';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [webhookUrl]);

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[220px] shadow-lg transition-all ${
        selected ? 'border-violet-400 shadow-violet-900/40' : 'border-violet-700'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-violet-900/60 flex items-center justify-center shrink-0">
          <Webhook size={16} className="text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Trigger</p>
          <p className="text-sm font-semibold text-slate-100">{data.label || 'Webhook'}</p>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-slate-400" />
          : <ChevronDown size={14} className="text-slate-400" />}
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <div className="px-4 pb-3">
          <p className="text-xs text-violet-300/50 font-mono truncate">POST /webhook/…</p>
        </div>
      )}

      {/* Expanded — show the URL */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-2">
          <p className="text-xs text-slate-400 font-medium">Webhook URL</p>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5">
            <p className="text-xs text-violet-300 font-mono flex-1 break-all">{webhookUrl}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-200 transition-colors"
              title="Copy URL"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Send a <code className="text-violet-400">POST</code> request with a JSON body to this URL to trigger the workflow. The body becomes the output of this node.
          </p>
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#a78bfa', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
