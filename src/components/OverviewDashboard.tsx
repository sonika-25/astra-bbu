import { useMemo, useState } from 'react';
import type { Route } from '../App';
import {
  PRODUCTS, LAUNCHES, MATRIX_COLUMNS, COUNTRY_FLAGS, PHASES,
  getProduct, findLaunch, nextMilestone, createLaunch, STATUS_LABELS,
  type Launch, type Status, type Phase,
} from '../data/mockData';
import { saveBlob } from '../utils/exporters';

const STATUS_CLASS: Record<Status, string> = {
  'delayed': 'st-delayed', 'at-risk': 'st-at-risk', 'on-track': 'st-on-track',
  'completed': 'st-completed', 'not-started': 'st-not-started', 'not-applicable': 'st-not-applicable',
};

interface Props {
  navigate: (r: Route) => void;
  initialStatusFilter?: string;
}

const RISK_LABEL: Record<Status, string> = {
  'delayed': 'Delayed', 'at-risk': 'At risk', 'on-track': 'On track',
  'completed': 'Completed', 'not-started': 'Not started', 'not-applicable': 'N/A',
};

const RISK_ORDER: Record<Status, number> = {
  'delayed': 0, 'at-risk': 1, 'not-started': 2, 'on-track': 3, 'completed': 4, 'not-applicable': 5,
};

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function compactPhase(phase: string): string {
  const parts = phase.split(' to ');
  const end = parts[parts.length - 1];
  return end === 'Launch' ? parts[0] : end;
}

function barClass(l: Launch): string {
  return l.status === 'delayed' ? 'st-delayed' : l.status === 'at-risk' ? 'st-at-risk' : 'st-on-track';
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Parse "Jul/26", "Jul/2026" or an ISO date into an ISO string. */
function parseTargetDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.toLowerCase().match(/^([a-z]{3})[\s/-]+(\d{2}|\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[1]);
    if (mi >= 0) {
      const yr = m[2].length === 2 ? 2000 + parseInt(m[2], 10) : parseInt(m[2], 10);
      return `${yr}-${String(mi + 1).padStart(2, '0')}-01`;
    }
  }
  return null;
}

export function OverviewDashboard({ navigate, initialStatusFilter }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('matrix');
  const [diseaseFilter, setDiseaseFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? 'All');

  // Create Launch modal
  const [showCreate, setShowCreate] = useState(false);
  const [cProductId, setCProductId] = useState(PRODUCTS[0].id);
  const [cCountry, setCCountry] = useState('Germany');
  const [cStatus, setCStatus] = useState<Status>('on-track');
  const [cPhase, setCPhase] = useState<Phase>(PHASES[0]);
  const [cDate, setCDate] = useState('');
  const [cError, setCError] = useState('');

  const countryOptions = useMemo(() => Object.keys(COUNTRY_FLAGS), []);

  const submitCreate = () => {
    const iso = parseTargetDate(cDate);
    if (!iso) { setCError('Enter a target date like "Jul/26".'); return; }
    if (findLaunch(cProductId, cCountry)) {
      setCError(`${getProduct(cProductId).brand} already has a ${cCountry} launch.`); return;
    }
    const launch = createLaunch({ productId: cProductId, country: cCountry, status: cStatus, phase: cPhase, launchDate: iso });
    setShowCreate(false);
    setCError(''); setCDate('');
    navigate({ view: 'summary', launchId: launch.id });
  };

  const diseases = useMemo(() => ['All', ...new Set(PRODUCTS.map(p => p.tumor))], []);
  /* Legacy indication filter removed in favour of Disease Area.
  const tumors = useMemo(() => ['All', ...new Set(PRODUCTS.map(p => p.tumor).filter(t => t !== '—'))], []);
  */
  const brands = useMemo(() => ['All', ...new Set(PRODUCTS.map(p => p.brand))], []);

  const matchesProduct = (p: { brand: string; tumor: string }) =>
    (diseaseFilter === 'All' || p.tumor === diseaseFilter) &&
    (brandFilter === 'All' || p.brand === brandFilter);

  const anyFilter = diseaseFilter !== 'All' || brandFilter !== 'All' || countryFilter !== 'All' || statusFilter !== 'All';
  const clearFilters = () => { setDiseaseFilter('All'); setBrandFilter('All'); setCountryFilter('All'); setStatusFilter('All'); };

  const launches = useMemo(() => {
    return LAUNCHES
      .filter(l => {
        const p = getProduct(l.productId);
        if (!matchesProduct(p)) return false;
        if (countryFilter !== 'All' && l.country !== countryFilter) return false;
        if (statusFilter !== 'All' && RISK_LABEL[l.status] !== statusFilter) return false;
        return true;
      })
      .sort((a, b) =>
        RISK_ORDER[a.status] - RISK_ORDER[b.status] ||
        new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diseaseFilter, brandFilter, countryFilter, statusFilter]);

  // KPI summary (always across the full portfolio, not the filtered set)
  const kpis = useMemo(() => {
    const now = Date.now();
    const in90 = now + 90 * 24 * 3600 * 1000;
    const milestonesSoon = LAUNCHES.flatMap(l => l.milestones)
      .filter(m => m.status !== 'completed' && new Date(m.date).getTime() <= in90).length;
    return {
      active: LAUNCHES.length,
      onTrack: LAUNCHES.filter(l => l.status === 'on-track' || l.status === 'completed').length,
      atRisk: LAUNCHES.filter(l => l.status === 'at-risk' || l.status === 'delayed').length,
      milestonesSoon,
    };
  }, []);

  const products = PRODUCTS.filter(matchesProduct);
  const matrixColumns = countryFilter === 'All' ? MATRIX_COLUMNS : MATRIX_COLUMNS.filter(country => country === countryFilter);

  const exportPortfolio = () => {
    const cells = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = launches.map(launch => {
      const product = getProduct(launch.productId);
      return [product.brand, product.tumor, launch.country, RISK_LABEL[launch.status], launch.completion, launch.currentPhase, launch.launchDate]
        .map(cells).join(',');
    });
    const csv = ['Brand,Disease Area,Country,Status,Readiness,Phase,Launch Date', ...rows].join('\n');
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'portfolio-launches.csv');
  };

  return (
    <main className="dash2">
      <div className="dash2-head">
        <div>
          <span className="dash2-eyebrow">Portfolio command centre</span>
          <h1>Overview Dashboard</h1>
          <p className="subtitle">A clear signal on global and market readiness</p>
        </div> 
        <div className="dash2-kpis-inline">
          <span><strong>{kpis.active}</strong>Active launches</span>
          <span className="dash2-kpi-good"><strong>{kpis.onTrack}</strong>On track</span>
          <span className="dash2-kpi-risk"><strong>{kpis.atRisk}</strong>At risk</span>
          <span className="dash2-kpi-warn"><strong>{kpis.milestonesSoon}</strong>Milestones soon</span>
        </div>
        <div className="view-toggle dash2-head-toggle">
          <button className={viewMode === 'list' ? 'toggle-active' : ''} onClick={() => setViewMode('list')}>
            Portfolio list
          </button>
          <button className={viewMode === 'matrix' ? 'toggle-active' : ''} onClick={() => setViewMode('matrix')}>
            Country matrix
          </button>
        </div>
        <button className="btn-primary" onClick={() => { setCError(''); setShowCreate(true); }}>+ Create Launch</button>
      </div>

      <div className="kpi-row dash2-kpis-legacy">
        <div className="kpi-card">
          <span className="kpi-icon">○</span>
          <span className="kpi-value">{kpis.active}</span>
          <span className="kpi-label">Active launches</span>
        </div>
        <div className="kpi-card kpi-good">
          <span className="kpi-icon">✓</span>
          <span className="kpi-value">{kpis.onTrack}</span>
          <span className="kpi-label">On track</span>
        </div>
        <div className="kpi-card kpi-bad">
          <span className="kpi-icon">!</span>
          <span className="kpi-value">{kpis.atRisk}</span>
          <span className="kpi-label">At risk or delayed</span>
        </div>
        <div className="kpi-card kpi-warn">
          <span className="kpi-icon">◷</span>
          <span className="kpi-value">{kpis.milestonesSoon}</span>
          <span className="kpi-label">Milestones in next 90 days</span>
        </div>
      </div>

      <div className="dash2-toolbar">
        <div className="dash2-filters">
          <label>DISEASE AREA<select value={diseaseFilter} onChange={e => setDiseaseFilter(e.target.value)}>
            {diseases.map(d => <option key={d} value={d}>{d === 'All' ? 'All Areas' : d}</option>)}
          </select></label>
          <label>BRAND<select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
            {brands.map(b => <option key={b} value={b}>{b === 'All' ? 'All Brands' : b}</option>)}
          </select></label>
          <label>STATUS<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option>All</option><option>On track</option><option>At risk</option><option>Delayed</option>
          </select></label>
          <label>COUNTRY<select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
            <option>All</option>{countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select></label>
        </div>
        <button className="overview-export" onClick={exportPortfolio}>▣ Export</button>
        {anyFilter && <button className="overview-clear" onClick={clearFilters}>↶ Clear</button>}
        <div className="legend legend-status matrix-legend">
          {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
            <span key={s}><i className={`dot ${STATUS_CLASS[s]}`} /> {STATUS_LABELS[s]}</span>
          ))}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="launch-list">
          <div className="launch-list-header">
            <span>Launch</span><span>Country</span><span>Phase</span>
            <span>Readiness</span><span>Next milestone</span><span>Status</span><span>Lead</span>
          </div>
          {launches.map(l => {
            const p = getProduct(l.productId);
            const next = nextMilestone(l);
            return (
              <button key={l.id} className="launch-row" onClick={() => navigate({ view: 'summary', launchId: l.id })}>
                <span className="lr-brand">
                  <strong>{p.brand}</strong>
                  <small>{p.code} · {p.indication}</small>
                </span>
                <span className="lr-country">{COUNTRY_FLAGS[l.country]} {l.country}</span>
                <span className="lr-phase">{l.currentPhase}</span>
                <span className="lr-readiness">
                  <span className="mini-bar"><span className={barClass(l)} style={{ width: `${l.completion}%` }} /></span>
                  <span className="lr-pct">{l.completion}%</span>
                </span>
                <span className="lr-milestone">
                  {next ? <><strong>{next.label}</strong><small>{fmtShort(next.date)}</small></> : <small>All complete</small>}
                </span>
                <span><span className={`pill pill-${l.status}`}>{RISK_LABEL[l.status]}</span></span>
                <span className="lr-lead">{l.launchManager}</span>
              </button>
            );
          })}
          {launches.length === 0 && <div className="empty-note">No launches match the current filters.</div>}
        </div>
      ) : (
        <>
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="matrix-rowhead">Brand / Disease area</th>
                {matrixColumns.map(c => (
                  <th key={c}><span className="col-flag">{COUNTRY_FLAGS[c]}</span><span>{c}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <th className="matrix-rowhead">
                    <div className="row-product">{p.brand}</div>
                    <div className="row-meta">{p.tumor === '—' ? p.therapy : p.tumor}</div>
                  </th>
                  {matrixColumns.map(c => {
                    const launch = findLaunch(p.id, c);
                    if (!launch || (statusFilter !== 'All' && RISK_LABEL[launch.status] !== statusFilter)) {
                      return <td key={c} />;
                    }
                    return (
                      <td key={c}>
                        <button
                          className={`launch-cell launch-cell-${launch.status}`}
                          onClick={() => navigate({ view: 'summary', launchId: launch.id })}
                        >
                          <span className={`pill pill-${launch.status}`}>{launch.launchLabel}</span>
                          <span className="cell-phase">{compactPhase(launch.currentPhase)}</span>
                          <span className="mini-bar"><span className={barClass(launch)} style={{ width: `${launch.completion}%` }} /></span>
                          <span className="cell-pct">{launch.completion}%</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-head">
              <h2>Create Launch Entry</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Close">✕</button>
            </div>
            <p className="create-modal-note">
              Tasks are cloned from the launch template; the launch lead is inherited from an
              existing {getProduct(cProductId).brand} or {cCountry} launch.
            </p>
            <div className="create-grid">
              <label>Brand
                <select value={cProductId} onChange={e => setCProductId(e.target.value)}>
                  {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.brand} — {p.indication}</option>)}
                </select>
              </label>
              <label>Country
                <select value={cCountry} onChange={e => setCCountry(e.target.value)}>
                  {countryOptions.map(c => <option key={c} value={c}>{COUNTRY_FLAGS[c]} {c}</option>)}
                </select>
              </label>
              <label>Status
                <select value={cStatus} onChange={e => setCStatus(e.target.value as Status)}>
                  {(['on-track', 'at-risk', 'delayed', 'not-started'] as Status[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              <label>Launch Phase
                <select value={cPhase} onChange={e => setCPhase(e.target.value as Phase)}>
                  {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="create-span">Target Date (e.g. Jul/26)
                <input value={cDate} placeholder="e.g. Jul/26" onChange={e => setCDate(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitCreate()} />
              </label>
            </div>
            {cError && <p className="create-error">{cError}</p>}
            <div className="create-actions">
              <button className="btn-plain" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={submitCreate}>Create Launch</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
