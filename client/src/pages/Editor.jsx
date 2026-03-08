import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import {
  Play,
  Save,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronDown,
  X,
  Trash2,
  ArrowLeft,
  Pencil,
  Check,
  Download,
} from 'lucide-react';

import Sidebar from '../components/Sidebar.jsx';
import StartNode from '../nodes/StartNode.jsx';
import HttpNode from '../nodes/HttpNode.jsx';
import CodeNode from '../nodes/CodeNode.jsx';
import WebhookNode from '../nodes/WebhookNode.jsx';
import AiTextNode from '../nodes/AiTextNode.jsx';
import ScheduleNode from '../nodes/ScheduleNode.jsx';

const nodeTypes = {
  startNode: StartNode,
  webhookNode: WebhookNode,
  scheduleNode: ScheduleNode,
  httpNode: HttpNode,
  codeNode: CodeNode,
  aiTextNode: AiTextNode,
};

const getNextId = () => `node_${Date.now()}`;

// ---------- Output Panel ----------
function OutputPanel({ result, running, error, onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!result && !running && !error) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-700 flex flex-col z-10">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {running && <Loader2 size={14} className="animate-spin text-sky-400" />}
          {!running && error && <AlertCircle size={14} className="text-red-400" />}
          {!running && !error && result && <CheckCircle2 size={14} className="text-emerald-400" />}
          <span className="text-sm font-semibold text-slate-200">Last Run Output</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-auto p-3">
          {running && (
            <div className="flex items-center gap-2 text-sky-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Running workflow...
            </div>
          )}
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-400 text-xs font-mono">{error}</p>
            </div>
          )}
          {result && !running && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Execution Order</p>
                <div className="flex flex-wrap gap-1">
                  {result.executionOrder?.map((id, i) => (
                    <span key={id} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                      {i + 1}. {id}
                    </span>
                  ))}
                </div>
              </div>
              {result.nodeResults && Object.values(result.nodeResults).map((nr) => (
                <div key={nr.nodeId} className={`rounded-lg border p-2 ${nr.status === 'success' ? 'border-emerald-800/50 bg-emerald-900/10' : 'border-red-800/50 bg-red-900/10'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {nr.status === 'success'
                      ? <CheckCircle2 size={12} className="text-emerald-400" />
                      : <AlertCircle size={12} className="text-red-400" />}
                    <span className="text-xs font-medium text-slate-300">{nr.label}</span>
                    <span className="text-xs text-slate-500 ml-auto">{nr.nodeType}</span>
                  </div>
                  {nr.error && <p className="text-xs text-red-400 font-mono">{nr.error}</p>}
                  {nr.output && (
                    <pre className="text-xs text-slate-400 font-mono overflow-auto max-h-40 mt-1">
                      {JSON.stringify(nr.output, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              {result.finalOutput && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Final Output</p>
                  <pre className="text-xs text-sky-300 font-mono bg-sky-900/10 border border-sky-800/30 rounded-lg p-3 overflow-auto max-h-60">
                    {JSON.stringify(result.finalOutput, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Editable workflow name ----------
function WorkflowNameEditor({ name, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(name); }, [name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onChange(trimmed);
    else setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(name); setEditing(false); } }}
          className="nodrag bg-slate-700 border border-sky-500 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-100 focus:outline-none w-48"
        />
        <button onClick={commit} className="p-1 rounded hover:bg-slate-700 text-emerald-400 transition-colors">
          <Check size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-700 transition-colors group"
      title="Click to rename"
    >
      <span className="text-sm font-semibold text-slate-100 max-w-[200px] truncate">{name}</span>
      <Pencil size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
    </button>
  );
}

// ---------- Main Flow Editor ----------
function FlowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [loadingWorkflow, setLoadingWorkflow] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [selectedElements, setSelectedElements] = useState({ nodes: [], edges: [] });

  // Load workflow on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await axios.get(`/api/workflows/${id}`);
        if (cancelled) return;
        setWorkflowName(data.name || 'Untitled Workflow');
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } catch (err) {
        if (!cancelled) setLoadError(err.response?.status === 404 ? 'Workflow not found.' : 'Failed to load workflow.');
      } finally {
        if (!cancelled) setLoadingWorkflow(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, setNodes, setEdges]);

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }) => {
    setSelectedElements({ nodes: selNodes, edges: selEdges });
  }, []);

  const hasSelection = selectedElements.nodes.length > 0 || selectedElements.edges.length > 0;

  const handleDeleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(selectedElements.nodes.map((n) => n.id));
    const selectedEdgeIds = new Set(selectedElements.edges.map((e) => e.id));
    setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedEdgeIds.has(e.id)));
    setSelectedElements({ nodes: [], edges: [] });
  }, [selectedElements, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!reactFlowInstance) return;
      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;
      let nodeData;
      try { nodeData = JSON.parse(raw); } catch { return; }
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setNodes((nds) => nds.concat({
        id: getNextId(),
        type: nodeData.type,
        position,
        data: { label: nodeData.label, ...nodeData.defaultData },
      }));
    },
    [reactFlowInstance, setNodes]
  );

  const handleRun = useCallback(async () => {
    setRunning(true);
    setRunResult(null);
    setRunError(null);
    try {
      const { data } = await axios.post('/api/run', { nodes, edges });
      setRunResult(data);
    } catch (err) {
      setRunError(err.response?.data?.error || err.message);
    } finally {
      setRunning(false);
    }
  }, [nodes, edges]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await axios.put(`/api/workflows/${id}`, { name: workflowName, nodes, edges });
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Error saving');
    } finally {
      setSaving(false);
    }
  }, [id, workflowName, nodes, edges]);

  const handleExport = useCallback(() => {
    const payload = { name: workflowName, nodes, edges };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workflowName, nodes, edges]);

  // Loading / error states
  if (loadingWorkflow) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-sky-500" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center flex-col gap-4">
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-slate-300 font-semibold">{loadError}</p>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm text-slate-200 transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 shrink-0 gap-3">
          {/* Left: back + logo + name */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-colors shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <Zap size={16} className="text-sky-400" />
              <span className="font-bold text-slate-300 text-sm hidden lg:block">FlowForge</span>
              <span className="text-slate-700 hidden lg:block">/</span>
            </div>
            <WorkflowNameEditor name={workflowName} onChange={setWorkflowName} />
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {saveMsg && (
              <span className={`text-xs font-medium ${saveMsg === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>
                {saveMsg}
              </span>
            )}
            <button
              onClick={handleExport}
              title="Export workflow as JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-slate-200 transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={!hasSelection}
              title="Delete selected (Del / Backspace)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-sm font-medium text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button
              onClick={handleRun}
              disabled={running || nodes.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-white" />}
              Run
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Delete', 'Backspace']}
            style={{ background: '#020617' }}
          >
            <Controls />
            <MiniMap nodeStrokeColor="#334155" nodeColor="#1e293b" maskColor="rgba(0,0,0,0.3)" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Zap size={48} className="text-slate-800 mx-auto mb-3" />
                <p className="text-slate-600 text-lg font-medium">Drag nodes from the sidebar to get started</p>
                <p className="text-slate-700 text-sm mt-1">Connect them and click "Run"</p>
              </div>
            </div>
          )}

          <OutputPanel
            result={runResult}
            running={running}
            error={runError}
            onClose={() => { setRunResult(null); setRunError(null); }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
