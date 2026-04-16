import { X } from 'lucide-react';
import { WIDGET_META, WIDGET_TYPES } from './widgets';

export default function AddWidgetModal({ onAdd, onClose, existing }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-text font-semibold">Add Widget</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={16} /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
          {Object.entries(WIDGET_META).map(([type, meta]) => {
            const count = existing.filter(t => t === type).length;
            return (
              <button
                key={type}
                onClick={() => onAdd(type)}
                className="flex flex-col items-start gap-1 p-3 rounded-xl border border-border bg-surface hover:border-primary hover:bg-primary/10 transition-all text-left group"
              >
                <span className="text-text text-sm font-medium group-hover:text-primary">{meta.label}</span>
                <span className="text-muted text-[10px]">{count > 0 ? `${count} active` : 'Not added'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
