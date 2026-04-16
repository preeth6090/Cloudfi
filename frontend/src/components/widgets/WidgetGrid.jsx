import { useState, useCallback, lazy, Suspense } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Plus, X } from 'lucide-react';
import { WIDGET_META, WIDGET_TYPES, DEFAULT_LAYOUT } from './widgets';
import AddWidgetModal from './AddWidgetModal';

const ResponsiveGrid = WidthProvider(Responsive);

const WIDGET_COMPONENTS = {
  [WIDGET_TYPES.POWER_GEN]:      lazy(() => import('./PowerWidget')),
  [WIDGET_TYPES.STEAM]:          lazy(() => import('./SteamWidget')),
  [WIDGET_TYPES.MACHINE_HEALTH]: lazy(() => import('./MachineHealthWidget')),
  [WIDGET_TYPES.AI_ANOMALY]:     lazy(() => import('./AIAnomalyWidget')),
  [WIDGET_TYPES.ENERGY_COST]:    lazy(() => import('./EnergyWidget')),
  [WIDGET_TYPES.LIVE_FEED]:      lazy(() => import('./LiveFeedWidget')),
  [WIDGET_TYPES.BOILER]:         lazy(() => import('./BoilerWidget')),
  [WIDGET_TYPES.COGEN]:          lazy(() => import('./CogenWidget')),
  [WIDGET_TYPES.CARBON]:         lazy(() => import('./CarbonWidget')),
  [WIDGET_TYPES.PREDICTIVE]:     lazy(() => import('./PredictiveWidget')),
};

const STORAGE_KEY = 'cf_dashboard_layout';

function loadLayout() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_LAYOUT; }
  catch { return DEFAULT_LAYOUT; }
}

function WidgetShell({ id, type, onRemove, children }) {
  const meta = WIDGET_META[type] || {};
  return (
    <div className="widget-card h-full relative group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted text-xs font-medium uppercase tracking-wider">{meta.label}</span>
        <button
          onClick={() => onRemove(id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-danger p-0.5 rounded"
        >
          <X size={12} />
        </button>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function WidgetFallback() {
  return <div className="flex items-center justify-center h-full text-muted text-sm animate-pulse">Loading…</div>;
}

export default function WidgetGrid() {
  const [widgets, setWidgets]       = useState(loadLayout);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(false);

  const saveLayout = useCallback((items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const onLayoutChange = useCallback((layout) => {
    setWidgets(prev => {
      const updated = prev.map(w => {
        const l = layout.find(l => l.i === w.i);
        return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
      });
      saveLayout(updated);
      return updated;
    });
  }, [saveLayout]);

  const removeWidget = useCallback((id) => {
    setWidgets(prev => { const n = prev.filter(w => w.i !== id); saveLayout(n); return n; });
  }, [saveLayout]);

  const addWidget = useCallback((type) => {
    const meta = WIDGET_META[type] || { defaultW: 2, defaultH: 2, minW: 2, minH: 2 };
    const id = `w${Date.now()}`;
    const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    const entry = { i: id, type, x: 0, y: maxY, w: meta.defaultW, h: meta.defaultH };
    setWidgets(prev => { const n = [...prev, entry]; saveLayout(n); return n; });
    setShowModal(false);
  }, [widgets, saveLayout]);

  const gridLayout = widgets.map(w => ({
    i: w.i, x: w.x, y: w.y, w: w.w, h: w.h,
    minW: WIDGET_META[w.type]?.minW || 2,
    minH: WIDGET_META[w.type]?.minH || 2,
    isDraggable: editing,
    isResizable: editing,
  }));

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setEditing(e => !e)}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium ${
            editing ? 'bg-primary/20 border-primary text-primary' : 'bg-card border-border text-muted hover:text-text'
          }`}
        >
          {editing ? 'Done Editing' : 'Edit Layout'}
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus size={12} /> Add Widget
        </button>
        <button
          onClick={() => { setWidgets(DEFAULT_LAYOUT); saveLayout(DEFAULT_LAYOUT); }}
          className="px-3 py-1.5 text-xs rounded-lg bg-card border border-border text-muted hover:text-text transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Grid */}
      <ResponsiveGrid
        className="layout"
        layouts={{ lg: gridLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 10, md: 8, sm: 4 }}
        rowHeight={120}
        margin={[10, 10]}
        onLayoutChange={onLayoutChange}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".drag-handle"
      >
        {widgets.map(widget => {
          const Comp = WIDGET_COMPONENTS[widget.type];
          return (
            <div key={widget.i}>
              <WidgetShell id={widget.i} type={widget.type} onRemove={removeWidget}>
                {editing && <div className="drag-handle absolute inset-x-0 top-0 h-6 cursor-move opacity-0 group-hover:opacity-100" />}
                {Comp ? (
                  <Suspense fallback={<WidgetFallback />}>
                    <Comp />
                  </Suspense>
                ) : <WidgetFallback />}
              </WidgetShell>
            </div>
          );
        })}
      </ResponsiveGrid>

      {showModal && <AddWidgetModal onAdd={addWidget} onClose={() => setShowModal(false)} existing={widgets.map(w => w.type)} />}
    </div>
  );
}
