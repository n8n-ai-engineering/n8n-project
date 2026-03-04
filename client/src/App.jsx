import React, { useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';

import Sidebar from './components/Sidebar.jsx';
import StartNode from './nodes/StartNode.jsx';
import HttpNode from './nodes/HttpNode.jsx';
import CodeNode from './nodes/CodeNode.jsx';
import WebhookNode from './nodes/WebhookNode.jsx';
import AiTextNode from './nodes/AiTextNode.jsx';

// Register custom node types
const nodeTypes = {
  startNode: StartNode,
  webhookNode: WebhookNode,
  httpNode: HttpNode,
  codeNode: CodeNode,
  aiTextNode: AiTextNode,
};

let nodeIdCounter = 1;
const getNextId = () => `node_${nodeIdCounter++}`;

const WORKFLOW_ID = 'default-workflow';

// ---------- Output Panel ----------
function OutputPanel({ result, running, error, onClose }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!result && !running && !error) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-700 flex flex-col z-10">
      {/* Header */}
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
              {/* Execution order */}
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

              {/* Node results */}
              {result.nodeResults && Object.values(result.nodeResults).map((nr) => (
                <div key={nr.nodeId} className={`rounded-lg border p-2 ${nr.status === 'success' ? 'border-emerald-800/50 bg-emerald-900/10' : 'border-red-800/50 bg-red-900/10'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {nr.status === 'success'
                      ? <CheckCircle2 size={12} className="text-emerald-400" />
                      : <AlertCircle size={12} className="text-red-400" />}
                    <span className="text-xs font-medium text-slate-300">{nr.label}</span>
                    <span className="text-xs text-slate-500 ml-auto">{nr.nodeType}</span>
                  </div>
                  {nr.error && (
                    <p className="text-xs text-red-400 font-mono">{nr.error}</p>
                  )}
                  {nr.output && (
                    <pre className="text-xs text-slate-400 font-mono overflow-auto max-h-40 mt-1">
                      {JSON.stringify(nr.output, null, 2)}
                    </pre>
                  )}
                </div>
              ))}

              {/* Final output highlight */}
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

// ---------- Main App ----------
function FlowEditor() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // Drag-and-drop from sidebar
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
      try {
        nodeData = JSON.parse(raw);
      } catch {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getNextId(),
        type: nodeData.type,
        position,
        data: { label: nodeData.label, ...nodeData.defaultData },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Run workflow
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

  // Save workflow
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await axios.post('/api/workflow', {
        id: WORKFLOW_ID,
        name: 'My Workflow',
        nodes,
        edges,
      });
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Error saving');
    } finally {
      setSaving(false);
    }
  }, [nodes, edges]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-sky-400" />
            <span className="font-bold text-slate-100 text-lg">FlowForge</span>
            <span className="text-slate-500 text-sm ml-2">Workflow Automation</span>
          </div>

          <div className="flex items-center gap-3">
            {saveMsg && (
              <span className={`text-xs font-medium ${saveMsg === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>
                {saveMsg}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button
              onClick={handleRun}
              disabled={running || nodes.length === 0}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running
                ? <Loader2 size={14} className="animate-spin" />
                : <Play size={14} className="fill-white" />}
              Run Workflow
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
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
            style={{ background: '#020617' }}
          >
            <Controls />
            <MiniMap
              nodeStrokeColor="#334155"
              nodeColor="#1e293b"
              maskColor="rgba(0,0,0,0.3)"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
          </ReactFlow>

          {/* Empty state hint */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Zap size={48} className="text-slate-800 mx-auto mb-3" />
                <p className="text-slate-600 text-lg font-medium">Drag nodes from the sidebar to get started</p>
                <p className="text-slate-700 text-sm mt-1">Connect them and click "Run Workflow"</p>
              </div>
            </div>
          )}

          {/* Output panel */}
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

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
