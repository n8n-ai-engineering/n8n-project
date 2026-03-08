import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, X, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsModal({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'error'

  useEffect(() => {
    axios.get('/api/settings')
      .then(({ data }) => {
        setApiKey(data.apiKey || '');
        setBaseUrl(data.baseUrl || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await axios.post('/api/settings', { apiKey: apiKey.trim(), baseUrl: baseUrl.trim() });
      setStatus('ok');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-sky-400" />
            <h2 className="text-base font-semibold text-slate-100">Настройки API</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={24} className="animate-spin text-sky-500" />
            </div>
          ) : (
            <>
              {/* API Key */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500 pr-10 placeholder-slate-600"
                    placeholder="sk-or-v1-…"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    title={showKey ? 'Hide' : 'Show'}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Ключ OpenRouter: <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline">openrouter.ai/keys</a>
                </p>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  Base URL
                </label>
                <input
                  type="text"
                  className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500 placeholder-slate-600"
                  placeholder="https://openrouter.ai/api/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
                <p className="text-xs text-slate-600 mt-1">
                  Оставьте пустым — будет использоваться значение из <code className="text-slate-400">.env</code>
                </p>
              </div>

              {/* Status message */}
              {status === 'ok' && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 size={15} />
                  Настройки сохранены. Изменения применяются немедленно.
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={15} />
                  Не удалось сохранить настройки.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-200 transition-colors"
          >
            Закрыть
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
