import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { BrainCircuit, ChevronDown, ChevronUp, Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

// Suggestions shown in the combobox dropdown; user can also type any custom model ID.
// Models prefixed with "ollama/" are routed to local Ollama (http://localhost:11434).
const MODEL_SUGGESTIONS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-3.5-turbo',
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-chat:free',
  'google/gemini-2.0-flash-exp:free',
  'anthropic/claude-3-haiku',
  'meta-llama/llama-3.1-8b-instruct:free',
  'ollama/llama3',
  'ollama/mistral',
  'ollama/codellama',
  'ollama/phi3',
];

const DEFAULT_SYSTEM = 'You are a helpful assistant.';

export default function AiTextNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState('');
  const [testError, setTestError] = useState('');

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

  const handleTest = useCallback(async () => {
    const prompt = data.prompt || '';
    if (!prompt.trim()) {
      setTestError('User prompt is empty.');
      return;
    }
    setTesting(true);
    setTestOutput('');
    setTestError('');
    try {
      const { data: res } = await axios.post('/api/ai-agent', {
        prompt,
        model: data.model || 'gpt-4o-mini',
        system: data.systemPrompt || DEFAULT_SYSTEM,
      });
      setTestOutput(res.output);
    } catch (err) {
      setTestError(err.response?.data?.error || err.message);
    } finally {
      setTesting(false);
    }
  }, [data]);

  const currentModel = data.model || 'gpt-4o-mini';

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[300px] shadow-lg transition-all ${
        selected ? 'border-pink-400 shadow-pink-900/40' : 'border-pink-700'
      }`}
    >
      {/* Input handle */}
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
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">AI Agent</p>
          <p className="text-sm font-semibold text-slate-100 truncate">{data.label || 'AI Text'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-pink-400/70 bg-pink-900/30 px-2 py-0.5 rounded font-mono max-w-[120px] truncate">
            {currentModel}
          </span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* Collapsed preview */}
      {!expanded && data.prompt && (
        <div className="px-4 pb-3">
          <p className="text-xs text-pink-300/50 truncate font-mono">{data.prompt}</p>
        </div>
      )}

      {/* Expanded config */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3">

          {/* Model — combobox: pick a suggestion or type any custom model ID */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Model</label>
            <input
              list={`model-list-${id}`}
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-pink-500 placeholder-slate-600"
              placeholder="gpt-4o-mini"
              value={currentModel}
              onChange={(e) => updateData('model', e.target.value)}
            />
            <datalist id={`model-list-${id}`}>
              {MODEL_SUGGESTIONS.map((m) => <option key={m} value={m} />)}
            </datalist>
            <p className="text-xs text-slate-600 mt-1">
              OpenRouter ID, or <code className="text-pink-400/60">ollama/model-name</code> for local inference
            </p>
          </div>

          {/* Session ID (memory) */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Session ID
              <span className="ml-1.5 text-slate-600 font-normal normal-case">
                — links memory to a user; leave blank to disable
              </span>
            </label>
            <input
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-pink-500 placeholder-slate-600"
              placeholder="{{input.chat_id}}"
              value={data.sessionId || ''}
              onChange={(e) => updateData('sessionId', e.target.value)}
            />
            {(data.sessionId || '').trim() && (
              <p className="text-xs text-emerald-500/70 mt-1">
                Memory enabled — conversation history is stored per session
              </p>
            )}
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">System Prompt</label>
            <textarea
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500 resize-none"
              placeholder={DEFAULT_SYSTEM}
              rows={2}
              value={data.systemPrompt || ''}
              onChange={(e) => updateData('systemPrompt', e.target.value)}
            />
          </div>

          {/* User Prompt */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              User Prompt
              <span className="ml-1.5 text-slate-600 font-normal normal-case">
                — use <code className="text-pink-400/70">{'{{input.field}}'}</code> to reference previous node
              </span>
            </label>
            <textarea
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500 resize-none"
              placeholder={'Write a short poem about: {{input.data.current_weather.temperature}}°C weather.'}
              rows={4}
              value={data.prompt || ''}
              onChange={(e) => updateData('prompt', e.target.value)}
            />
          </div>

          {/* Test button */}
          <button
            onClick={handleTest}
            disabled={testing || !data.prompt?.trim()}
            className="flex items-center gap-1.5 w-full justify-center px-3 py-1.5 rounded-lg bg-pink-700 hover:bg-pink-600 text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testing
              ? <><Loader2 size={12} className="animate-spin" /> Running…</>
              : <><Play size={12} className="fill-white" /> Test Agent</>}
          </button>

          {/* Test result */}
          {testError && (
            <div className="flex items-start gap-1.5 bg-red-900/20 border border-red-700/40 rounded-lg px-2.5 py-2">
              <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400 font-mono break-all">{testError}</p>
            </div>
          )}
          {testOutput && !testError && (
            <div className="bg-slate-900/70 border border-pink-900/40 rounded-lg p-2.5">
              <div className="flex items-center gap-1 mb-1.5">
                <CheckCircle2 size={11} className="text-emerald-400" />
                <span className="text-xs text-slate-500">Response</span>
              </div>
              <p className="text-xs text-slate-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {testOutput}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#f472b6', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
