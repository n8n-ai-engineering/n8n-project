import React from 'react';
import {
  Play,
  Webhook,
  Globe,
  Code2,
  BrainCircuit,
  MessageSquare,
  Users,
  GripVertical,
  Clock,
} from 'lucide-react';

const SECTIONS = [
  {
    title: 'Triggers',
    items: [
      {
        type: 'startNode',
        label: 'Start',
        icon: Play,
        color: 'text-emerald-400',
        bg: 'bg-emerald-900/30 border-emerald-700/50',
        defaultData: {},
      },
      {
        type: 'webhookNode',
        label: 'Webhook',
        icon: Webhook,
        color: 'text-violet-400',
        bg: 'bg-violet-900/30 border-violet-700/50',
        defaultData: {},
      },
      {
        type: 'scheduleNode',
        label: 'Schedule',
        icon: Clock,
        color: 'text-teal-400',
        bg: 'bg-teal-900/30 border-teal-700/50',
        defaultData: { preset: 'every_hour', cronExpression: '' },
      },
    ],
  },
  {
    title: 'Actions',
    items: [
      {
        type: 'httpNode',
        label: 'HTTP Request',
        icon: Globe,
        color: 'text-sky-400',
        bg: 'bg-sky-900/30 border-sky-700/50',
        defaultData: { url: '', method: 'GET', headers: '{}', body: '' },
      },
      {
        type: 'codeNode',
        label: 'Code (JS)',
        icon: Code2,
        color: 'text-amber-400',
        bg: 'bg-amber-900/30 border-amber-700/50',
        defaultData: { code: '// Access previous node output via `input`\nreturn { result: input };' },
      },
      {
        type: 'aiTextNode',
        label: 'AI Text',
        icon: BrainCircuit,
        color: 'text-pink-400',
        bg: 'bg-pink-900/30 border-pink-700/50',
        defaultData: { prompt: '' },
      },
    ],
  },
  {
    title: 'Presets',
    items: [
      {
        type: 'httpNode',
        label: 'VK Wall Post',
        icon: Users,
        color: 'text-blue-400',
        bg: 'bg-blue-900/30 border-blue-700/50',
        defaultData: {
          url: 'https://api.vk.com/method/wall.post',
          method: 'POST',
          headers: '{"Content-Type": "application/x-www-form-urlencoded"}',
          body: 'owner_id=<USER_ID>&message=Hello!&access_token=<ACCESS_TOKEN>&v=5.131',
        },
      },
      {
        type: 'httpNode',
        label: 'Telegram Message',
        icon: MessageSquare,
        color: 'text-cyan-400',
        bg: 'bg-cyan-900/30 border-cyan-700/50',
        defaultData: {
          url: 'https://api.telegram.org/bot<BOT_TOKEN>/sendMessage',
          method: 'POST',
          headers: '{"Content-Type": "application/json"}',
          body: '{"chat_id": "<CHAT_ID>", "text": "Hello from FlowForge!"}',
        },
      },
    ],
  },
];

function DraggableItem({ item }) {
  const Icon = item.icon;

  const onDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({
        type: item.type,
        label: item.label,
        defaultData: item.defaultData,
      })
    );
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:brightness-110 select-none ${item.bg}`}
    >
      <GripVertical size={12} className="text-slate-600 shrink-0" />
      <Icon size={15} className={`shrink-0 ${item.color}`} />
      <span className="text-sm text-slate-200 font-medium">{item.label}</span>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Node Library</p>
      </div>

      <div className="flex-1 p-3 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <div className="space-y-1.5">
              {section.items.map((item) => (
                <DraggableItem key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-700">
        <p className="text-xs text-slate-600 text-center">Drag nodes onto the canvas</p>
      </div>
    </aside>
  );
}
