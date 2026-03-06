import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Zap,
  Plus,
  Trash2,
  GitBranch,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  Workflow,
} from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function WorkflowCard({ workflow, onDelete, onClick }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${workflow.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(workflow.id);
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-800/60 border border-slate-700 hover:border-sky-500/60 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:bg-slate-800 hover:shadow-lg hover:shadow-sky-900/10 flex flex-col gap-4"
    >
      {/* Icon + Name */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sky-900/50 border border-sky-700/40 flex items-center justify-center shrink-0">
            <Workflow size={18} className="text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate leading-tight">
              {workflow.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {workflow.nodeCount} node{workflow.nodeCount !== 1 ? 's' : ''}
              {' · '}
              {workflow.edgeCount} edge{workflow.edgeCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/30 transition-all disabled:opacity-50"
          title="Delete workflow"
        >
          {deleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Clock size={11} />
        <span>Updated {formatDate(workflow.updatedAt)}</span>
      </div>

      {/* Open arrow */}
      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight size={16} className="text-sky-400" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/workflows');
      setWorkflows(data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    } catch {
      setError('Failed to load workflows. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await axios.post('/api/workflows', { name: 'Untitled Workflow' });
      navigate(`/editor/${data.id}`);
    } catch {
      setError('Failed to create workflow.');
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    await axios.delete(`/api/workflows/${id}`);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Zap size={16} className="text-sky-400" />
            </div>
            <span className="font-bold text-lg text-slate-100">FlowForge</span>
            <span className="text-slate-600 text-sm hidden sm:block">Workflow Automation</span>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-sky-900/30"
          >
            {creating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            New Workflow
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">My Workflows</h1>
          <p className="text-slate-500 text-sm mt-1">
            Build and automate processes with drag-and-drop nodes.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-sky-500" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-5">
              <GitBranch size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-semibold text-lg mb-1">No workflows yet</p>
            <p className="text-slate-600 text-sm mb-6">
              Create your first workflow to get started.
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Create Workflow
            </button>
          </div>
        )}

        {/* Workflow grid */}
        {!loading && workflows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                onDelete={handleDelete}
                onClick={() => navigate(`/editor/${wf.id}`)}
              />
            ))}

            {/* Create card */}
            <button
              onClick={handleCreate}
              disabled={creating}
              className="border-2 border-dashed border-slate-700 hover:border-sky-500/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-sky-400 transition-all min-h-[140px] disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Plus size={22} />
              )}
              <span className="text-sm font-medium">New Workflow</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
