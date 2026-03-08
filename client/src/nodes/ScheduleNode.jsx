import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

const PRESETS = [
  { value: 'every_minute',      label: 'Каждую минуту  (тест)' },
  { value: 'every_hour',        label: 'Каждый час' },
  { value: 'every_6h',          label: 'Каждые 6 часов' },
  { value: 'every_day_9am',     label: 'Каждый день в 9:00' },
  { value: 'every_day_midnight',label: 'Каждый день в 0:00' },
  { value: 'custom',            label: 'Своё расписание (cron)' },
];

const PRESET_LABELS = Object.fromEntries(PRESETS.map((p) => [p.value, p.label]));

export default function ScheduleNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [expanded, setExpanded] = useState(false);

  const updateData = useCallback(
    (field, value) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n))
      );
    },
    [id, setNodes]
  );

  const preset = data.preset || 'every_hour';
  const previewLabel = PRESET_LABELS[preset] || preset;

  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 min-w-[240px] shadow-lg transition-all ${
        selected ? 'border-teal-400 shadow-teal-900/40' : 'border-teal-700'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-teal-900/60 flex items-center justify-center shrink-0">
          <Clock size={16} className="text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Trigger</p>
          <p className="text-sm font-semibold text-slate-100">{data.label || 'Schedule'}</p>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-slate-400" />
          : <ChevronDown size={14} className="text-slate-400" />}
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <div className="px-4 pb-3">
          <span className="text-xs text-teal-300/60 font-mono">{previewLabel}</span>
        </div>
      )}

      {/* Expanded settings */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Расписание</label>
            <select
              className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              value={preset}
              onChange={(e) => updateData('preset', e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {preset === 'custom' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Cron-выражение
                <span className="ml-1 text-slate-600 normal-case font-normal">
                  (мин час день мес день_нед)
                </span>
              </label>
              <input
                className="nodrag w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500"
                placeholder="0 9 * * 1-5"
                value={data.cronExpression || ''}
                onChange={(e) => updateData('cronExpression', e.target.value)}
              />
            </div>
          )}

          <p className="text-xs text-slate-600">
            Задача запускается сервером автоматически. Сохраните воркфлоу, чтобы применить расписание.
          </p>
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#2dd4bf', border: '2px solid #1e293b' }}
      />
    </div>
  );
}
