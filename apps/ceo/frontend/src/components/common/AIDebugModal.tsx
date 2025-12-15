import React from 'react';
import { X, ServerCog } from 'lucide-react';
import { useAIDebugLogs } from '../../hooks/useAIDebugLogs';

interface AIDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatTimestamp = (value: number): string => {
  return new Date(value).toLocaleString();
};

const formatJSON = (value: unknown) => {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

export const AIDebugModal: React.FC<AIDebugModalProps> = ({ isOpen, onClose }) => {
  const logs = useAIDebugLogs();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur" onClick={onClose} />
      <div className="relative z-10 flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3 text-slate-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 via-purple-500 to-primary-700 flex items-center justify-center">
              <ServerCog size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Call Debugger</h2>
              <p className="text-xs text-slate-300">Most recent calls across the interface (max 5)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/70 transition"
            aria-label="Close AI debug modal"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-slate-950/90">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>No AI calls recorded yet. Trigger an AI action to populate this log.</p>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="glass-effect border border-primary-500/20 rounded-2xl p-4 bg-white/5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                    <span className="font-semibold text-primary-200">{log.endpoint}</span>
                    <span className="text-xs text-slate-400">{formatTimestamp(log.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      log.status >= 200 && log.status < 300
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-red-500/20 text-red-200'
                    }`}>
                      {log.status}
                    </span>
                    {log.model && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-700/70 text-slate-100">{log.model}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-200 uppercase tracking-wide">Request</h3>
                    <pre className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-slate-300 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                      {formatJSON(log.requestBody)}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-200 uppercase tracking-wide">Response</h3>
                    <pre className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-slate-300 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                      {log.error ? `${log.error}\n\n${formatJSON(log.responseBody)}` : formatJSON(log.responseBody)}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
