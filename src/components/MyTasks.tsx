import { useMemo, useState } from 'react';
import type { Route } from '../App';
import {
  CURRENT_USER, tasksForOwner, TASK_TYPE_LABELS,
  type Status, type MyTask,
} from '../data/mockData';

interface Props {
  navigate: (r: Route) => void;
  initialRiskFilter?: 'high-risk';
}

const STATUS_LABEL: Record<Status, string> = {
  'delayed': 'Delayed', 'at-risk': 'At risk', 'on-track': 'On track',
  'completed': 'Completed', 'not-started': 'Not started', 'not-applicable': 'N/A',
};

const STATUS_ORDER: Record<Status, number> = {
  'delayed': 0, 'at-risk': 1, 'not-started': 2, 'on-track': 3, 'completed': 4, 'not-applicable': 5,
};

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function MyTasks({ navigate, initialRiskFilter }: Props) {
  const base = useMemo(() => tasksForOwner(CURRENT_USER), []);

  // Local status overrides (so "mark done" works without touching module data).
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [riskFilter, setRiskFilter] = useState<'all' | 'high-risk' | 'open'>(initialRiskFilter ?? 'all');
  const [brandFilter, setBrandFilter] = useState('All');

  // Custom export panel
  const [showExport, setShowExport] = useState(false);
  const [exportCols, setExportCols] = useState<Record<string, boolean>>({
    Task: true, Brand: true, Country: true, Function: true, Status: true, 'Due date': true,
  });
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
  const [exportedFile, setExportedFile] = useState<string | null>(null);

  const effStatus = (mt: MyTask): Status => overrides[mt.task.id] ?? mt.task.status;

  const brands = useMemo(() => {
    return ['All', ...Array.from(new Set(base.map(mt => mt.product.brand))).sort()];
  }, [base]);

  const filtered = useMemo(() => {
    return base
      .filter(mt => {
        const s = effStatus(mt);
        if (riskFilter === 'high-risk' && s !== 'delayed' && s !== 'at-risk') return false;
        if (riskFilter === 'open' && s === 'completed') return false;
        if (brandFilter !== 'All' && mt.product.brand !== brandFilter) return false;
        return true;
      })
      .sort((a, b) =>
        STATUS_ORDER[effStatus(a)] - STATUS_ORDER[effStatus(b)] ||
        new Date(a.task.endDate).getTime() - new Date(b.task.endDate).getTime());
  }, [base, riskFilter, brandFilter, overrides]);

  // Completion across ALL my tasks (not the filtered subset)
  const stats = useMemo(() => {
    const total = base.length;
    const done = base.filter(mt => effStatus(mt) === 'completed').length;
    const delayed = base.filter(mt => effStatus(mt) === 'delayed').length;
    const atRisk = base.filter(mt => effStatus(mt) === 'at-risk').length;
    return { total, done, delayed, atRisk, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [base, overrides]);

  function markDone(id: string) {
    setOverrides(o => ({ ...o, [id]: 'completed' }));
  }
  function reopen(id: string) {
    setOverrides(o => {
      const next = { ...o };
      delete next[id];
      return next;
    });
  }

  const hasFilters = riskFilter !== 'all' || brandFilter !== 'All';

  function toggleCol(col: string) {
    setExportCols(c => ({ ...c, [col]: !c[col] }));
    setExportedFile(null);
  }

  function runExport() {
    const cols = Object.entries(exportCols).filter(([, v]) => v).length;
    if (cols === 0) return;
    const scope = hasFilters ? 'Filtered' : 'All';
    setExportedFile(`MyTasks_${scope}_${filtered.length}rows_${cols}cols.${exportFormat}`);
  }

  return (
    <main className="mt-main">
      {/* ---- Header + completion ---- */}
      <section className="mt-hero card">
        <div className="mt-hero-left">
          <div className="mt-avatar">RR</div>
          <div>
            <h1>My Tasks</h1>
            <p className="mt-hero-sub">{CURRENT_USER} · Launch Manager</p>
          </div>
        </div>
        <div className="mt-hero-right">
          <div className="mt-progress-head">
            <span className="mt-progress-pct">{stats.pct}%</span>
            <span className="mt-progress-cap">{stats.done} of {stats.total} complete</span>
          </div>
          <div className="mt-progress-bar">
            <div className="mt-progress-fill" style={{ width: `${stats.pct}%` }} />
          </div>
          <div className="mt-progress-flags">
            {stats.delayed > 0 && <span className="flag-delayed">{stats.delayed} delayed</span>}
            {stats.atRisk > 0 && <span className="flag-soon">{stats.atRisk} at risk</span>}
            {stats.total - stats.done > 0 && <span className="mt-flag-open">{stats.total - stats.done} open</span>}
          </div>
        </div>
      </section>

      {/* ---- Filters ---- */}
      <div className="mt-toolbar">
        <div className="mt-filter-pills">
          <button className={riskFilter === 'all' ? 'mt-fp mt-fp-active' : 'mt-fp'} onClick={() => setRiskFilter('all')}>All</button>
          <button className={riskFilter === 'open' ? 'mt-fp mt-fp-active' : 'mt-fp'} onClick={() => setRiskFilter('open')}>Open</button>
          <button className={riskFilter === 'high-risk' ? 'mt-fp mt-fp-active' : 'mt-fp'} onClick={() => setRiskFilter('high-risk')}>High risk</button>
        </div>
        <select className="mt-brand-select" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          {brands.map(b => <option key={b} value={b}>{b === 'All' ? 'All brands' : b}</option>)}
        </select>
        {hasFilters && (
          <button className="lp-clear-btn" onClick={() => { setRiskFilter('all'); setBrandFilter('All'); }}>Clear</button>
        )}
        <span className="mt-count">{filtered.length} shown</span>
        <div className="mt-export-wrap">
          <button className={`mt-export-btn ${showExport ? 'mt-export-open' : ''}`} onClick={() => setShowExport(s => !s)}>
            ⬇ Export ▾
          </button>
          {showExport && (
            <div className="mt-export-panel">
              <div className="mt-export-title">Columns</div>
              <div className="mt-export-cols">
                {Object.keys(exportCols).map(col => (
                  <label key={col} className="mt-export-check">
                    <input type="checkbox" checked={exportCols[col]} onChange={() => toggleCol(col)} />
                    {col}
                  </label>
                ))}
              </div>
              <div className="mt-export-title">Format</div>
              <div className="mt-export-formats">
                {(['csv', 'xlsx', 'pdf'] as const).map(f => (
                  <button
                    key={f}
                    className={`mt-fmt ${exportFormat === f ? 'mt-fmt-active' : ''}`}
                    onClick={() => { setExportFormat(f); setExportedFile(null); }}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="mt-export-foot">
                <span className="mt-export-scope">{filtered.length} rows · {hasFilters ? 'filtered' : 'all tasks'}</span>
                <button className="btn-primary mt-export-go" onClick={runExport}>Export</button>
              </div>
              {exportedFile && (
                <div className="mt-export-file"><span className="file-ic">✓</span>{exportedFile}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Task list ---- */}
      <section className="mt-list">
        {filtered.length === 0 ? (
          <div className="lp-empty">
            <div className="lp-empty-icon">✅</div>
            <div className="lp-empty-text">No tasks match — you’re all caught up here.</div>
          </div>
        ) : filtered.map((mt, i) => {
          const s = effStatus(mt);
          const isDone = s === 'completed';
          return (
            <div key={mt.task.id} className={`mt-task ${isDone ? 'mt-task-done' : ''}`}>
              <span className="mt-num">{i + 1}</span>
              <button
                className={`mt-check ${isDone ? 'mt-check-on' : ''}`}
                onClick={() => isDone ? reopen(mt.task.id) : markDone(mt.task.id)}
                aria-label={isDone ? 'Reopen task' : 'Mark done'}
              >
                <span className="mt-check-mark">✓</span>
              </button>
              <div className="mt-task-body" onClick={() => navigate({ view: 'tasks', launchId: mt.launch.id, fn: mt.task.leadFunction })}>
                <div className="mt-task-name">{mt.task.name}</div>
                <div className="mt-task-meta">
                  {mt.product.brand} — {mt.launch.country} · {mt.task.leadFunction} · due {fmtShort(mt.task.endDate)}
                </div>
              </div>
              <div className="mt-task-tags">
                <span className="tag">{TASK_TYPE_LABELS[mt.task.taskType]}</span>
                {mt.task.origin === 'global' && <span className="tag tag-global">Global</span>}
                <span className={`pill pill-${s}`}>{STATUS_LABEL[s]}</span>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
