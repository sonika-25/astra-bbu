import { useMemo, useState } from 'react';
import type { Route } from '../App';
import { PRODUCTS, LAUNCHES, COUNTRY_FLAGS, getProduct } from '../data/mockData';

interface Props {
  navigate: (r: Route) => void;
  initialViewMode?: 'calendar';
  initialCalendarYear?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function LaunchPipeline({ navigate, initialViewMode, initialCalendarYear }: Props) {
  const [therapeuticArea, setTherapeuticArea] = useState('All');
  const [brand, setBrand] = useState('All');
  const [country, setCountry] = useState('All');
  const [year, setYear] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'calendar' | 'timeline' | 'chart'>(initialViewMode ?? 'table');
  const [showModal, setShowModal] = useState(false);
  const [calYear, setCalYear] = useState(initialCalendarYear ?? 2027);

  // Extract filter options from data
  const therapeuticAreas = useMemo(() => {
    const areas = new Set(PRODUCTS.map(p => p.tumor));
    return ['All', ...Array.from(areas).sort()];
  }, []);

  const brands = useMemo(() => {
    const filtered = PRODUCTS.filter(p => therapeuticArea === 'All' || p.tumor === therapeuticArea);
    const b = new Set(filtered.map(p => p.brand));
    return ['All', ...Array.from(b).sort()];
  }, [therapeuticArea]);

  const countries = useMemo(() => {
    const c = new Set(LAUNCHES.map(l => l.country));
    return ['All', ...Array.from(c).sort()];
  }, []);

  const years = useMemo(() => {
    const y = new Set(LAUNCHES.map(l => new Date(l.launchDate).getFullYear()));
    return ['All', ...Array.from(y).sort().reverse().map(String)];
  }, []);

  // Filter launches
  const filtered = useMemo(() => {
    return LAUNCHES.filter(l => {
      const p = getProduct(l.productId);
      if (therapeuticArea !== 'All' && p.tumor !== therapeuticArea) return false;
      if (brand !== 'All' && p.brand !== brand) return false;
      if (country !== 'All' && l.country !== country) return false;
      if (year !== 'All' && new Date(l.launchDate).getFullYear() !== parseInt(year)) return false;
      return true;
    });
  }, [therapeuticArea, brand, country, year]);

  // Chart data: launches by year
  const launchesByYear = useMemo(() => {
    const map = new Map<number, number>();
    filtered.forEach(l => {
      const y = new Date(l.launchDate).getFullYear();
      map.set(y, (map.get(y) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const maxYear = Math.max(...launchesByYear.map(([, count]) => count), 1);

  // Chart data: launches by country (top 8)
  const launchesByCountry = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(l => {
      map.set(l.country, (map.get(l.country) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filtered]);

  const maxCountry = Math.max(...launchesByCountry.map(([, count]) => count), 1);

  // Calendar events: every key regulatory date from the filtered launches,
  // bucketed by month for the displayed year.
  type CalEvent = { type: 'submission' | 'approval' | 'reimbursement' | 'launch'; label: string; brand: string; country: string; day: number; launchId: string };
  const eventsByMonth = useMemo(() => {
    const months: CalEvent[][] = Array.from({ length: 12 }, () => []);
    filtered.forEach(l => {
      const p = getProduct(l.productId);
      const dates: [string, CalEvent['type'], string][] = [
        [l.dossierSubmission, 'submission', 'Submission'],
        [l.regulatoryApproval, 'approval', 'Reg. approval'],
        [l.reimbursementApproval, 'reimbursement', 'Reimbursement'],
        [l.launchDate, 'launch', 'Launch'],
      ];
      dates.forEach(([iso, type, label]) => {
        if (!iso) return;
        const d = new Date(iso);
        if (d.getFullYear() !== calYear) return;
        months[d.getMonth()].push({ type, label, brand: p.brand, country: l.country, day: d.getDate(), launchId: l.id });
      });
    });
    months.forEach(m => m.sort((a, b) => a.day - b.day));
    return months;
  }, [filtered, calYear]);

  const calYearsAvailable = useMemo(() => {
    const ys = new Set<number>();
    filtered.forEach(l => {
      [l.dossierSubmission, l.regulatoryApproval, l.reimbursementApproval, l.launchDate].forEach(iso => {
        if (iso) ys.add(new Date(iso).getFullYear());
      });
    });
    return Array.from(ys).sort();
  }, [filtered]);

  const hasFilters = therapeuticArea !== 'All' || brand !== 'All' || country !== 'All' || year !== 'All';

  function clearFilters() {
    setTherapeuticArea('All');
    setBrand('All');
    setCountry('All');
    setYear('All');
  }

  function fmtISO(iso: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toISOString().slice(0, 10);
  }

  return (
    <main className="lp-main">
      {/* ---- Header ---- */}
      <section className="lp-header">
        <div>
          <h1>Launch Pipeline</h1>
          <p className="lp-subtitle">Global launches in development, by regulatory stage and market</p>
        </div>
        <div className="lp-header-actions">
          <button className="btn-secondary">📤 Bulk upload</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Enter in pipeline</button>
        </div>
      </section>

      {/* ---- Filters ---- */}
      <section className="card lp-filters">
        <div className="lp-filter-row">
          <div className="lp-filter-group">
            <label>Therapeutic area</label>
            <select value={therapeuticArea} onChange={e => { setTherapeuticArea(e.target.value); setBrand('All'); }}>
              {therapeuticAreas.map(t => <option key={t} value={t}>{t === 'All' ? 'All areas' : t}</option>)}
            </select>
          </div>
          <div className="lp-filter-group">
            <label>Brand</label>
            <select value={brand} onChange={e => setBrand(e.target.value)}>
              {brands.map(b => <option key={b} value={b}>{b === 'All' ? 'All brands' : b}</option>)}
            </select>
          </div>
          <div className="lp-filter-group">
            <label>Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)}>
              {countries.map(c => <option key={c} value={c}>{c === 'All' ? 'All countries' : c}</option>)}
            </select>
          </div>
          <div className="lp-filter-group">
            <label>Year</label>
            <select value={year} onChange={e => setYear(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All years' : y}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button className="lp-clear-btn" onClick={clearFilters}>Clear filters</button>
          )}
        </div>
        <div className="lp-filter-summary">
          Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? 'launch' : 'launches'}
          {hasFilters && <span className="lp-filter-tag">🔍 Filtered</span>}
        </div>
      </section>

      {/* ---- View Toggle ---- */}
      <div className="lp-view-toggle">
        <button className={`toggle-btn ${viewMode === 'table' ? 'toggle-active' : ''}`} onClick={() => setViewMode('table')}>
          Table
        </button>
        <button className={`toggle-btn ${viewMode === 'calendar' ? 'toggle-active' : ''}`} onClick={() => setViewMode('calendar')}>
          Calendar
        </button>
        <button className={`toggle-btn ${viewMode === 'timeline' ? 'toggle-active' : ''}`} onClick={() => setViewMode('timeline')}>
          Timeline
        </button>
        <button className={`toggle-btn ${viewMode === 'chart' ? 'toggle-active' : ''}`} onClick={() => setViewMode('chart')}>
          Analytics
        </button>
      </div>

      {/* ---- Calendar View ---- */}
      {viewMode === 'calendar' && (
        <section className="card lp-calendar-card">
          <div className="lp-cal-head">
            <div className="lp-cal-nav">
              <button
                className="lp-cal-arrow"
                onClick={() => setCalYear(y => y - 1)}
                disabled={calYearsAvailable.length > 0 && calYear <= calYearsAvailable[0]}
              >‹</button>
              <span className="lp-cal-year">{calYear}</span>
              <button
                className="lp-cal-arrow"
                onClick={() => setCalYear(y => y + 1)}
                disabled={calYearsAvailable.length > 0 && calYear >= calYearsAvailable[calYearsAvailable.length - 1]}
              >›</button>
            </div>
            <div className="lp-cal-legend">
              <span className="lcl"><span className="lcl-dot ev-submission" />Submission</span>
              <span className="lcl"><span className="lcl-dot ev-approval" />Reg. approval</span>
              <span className="lcl"><span className="lcl-dot ev-reimbursement" />Reimbursement</span>
              <span className="lcl"><span className="lcl-dot ev-launch" />Launch</span>
            </div>
          </div>
          <div className="lp-cal-grid">
            {MONTHS.map((month, mi) => {
              const events = eventsByMonth[mi];
              return (
                <div key={month} className={`lp-cal-month ${events.length ? '' : 'lp-cal-month-empty'}`}>
                  <div className="lp-cal-month-name">{month}</div>
                  <div className="lp-cal-events">
                    {events.length === 0 ? (
                      <span className="lp-cal-none">—</span>
                    ) : events.map((ev, i) => (
                      <button
                        key={i}
                        className={`lp-cal-event ev-${ev.type}`}
                        onClick={() => navigate({ view: 'summary', launchId: ev.launchId })}
                        title={`${ev.label}: ${ev.brand} — ${ev.country} (${ev.day} ${month})`}
                      >
                        <span className="lce-day">{ev.day}</span>
                        <span className="lce-brand">{ev.brand}</span>
                        <span className="lce-country">{COUNTRY_FLAGS[ev.country]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- Table View ---- */}
      {viewMode === 'table' && (
        <section className="card lp-table-card">
          {filtered.length === 0 ? (
            <div className="lp-empty">
              <div className="lp-empty-icon">📭</div>
              <div className="lp-empty-text">No launches match your filters</div>
            </div>
          ) : (
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Country</th>
                  <th>Regulatory Submission</th>
                  <th>Regulatory Approval</th>
                  <th>Reimbursement</th>
                  <th>Launch Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const p = getProduct(l.productId);
                  return (
                    <tr key={l.id} onClick={() => navigate({ view: 'summary', launchId: l.id })}>
                      <td className="lpt-brand">{p.brand}</td>
                      <td>{COUNTRY_FLAGS[l.country]} {l.country}</td>
                      <td className="lpt-date">{fmtISO(l.dossierSubmission)}</td>
                      <td className="lpt-date">{fmtISO(l.regulatoryApproval)}</td>
                      <td className="lpt-date">{fmtISO(l.reimbursementApproval)}</td>
                      <td className="lpt-date">{fmtISO(l.launchDate)}</td>
                      <td><span className={`pill pill-${l.status}`}>{l.status === 'delayed' ? 'Delayed' : l.status === 'at-risk' ? 'At risk' : 'On track'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ---- Timeline View ---- */}
      {viewMode === 'timeline' && (
        <section className="card lp-timeline">
          <h2>Launches by regulatory stage</h2>
          <div className="lp-timeline-content">
            {filtered.length === 0 ? (
              <div className="lp-empty">
                <div className="lp-empty-icon">📭</div>
                <div className="lp-empty-text">No launches match your filters</div>
              </div>
            ) : (
              <div className="lp-launch-list">
                {filtered.map(l => {
                  const p = getProduct(l.productId);
                  return (
                    <div key={l.id} className="lp-launch-card" onClick={() => navigate({ view: 'summary', launchId: l.id })}>
                      <div className="llc-head">
                        <div>
                          <div className="llc-brand">{p.brand}</div>
                          <div className="llc-meta">{p.indication} · {p.tumor}</div>
                        </div>
                        <span className={`pill pill-${l.status}`}>{l.status === 'delayed' ? 'Delayed' : l.status === 'at-risk' ? 'At risk' : 'On track'}</span>
                      </div>
                      <div className="llc-details">
                        <span className="llc-detail-item">
                          <span className="llc-label">Country</span>
                          <span className="llc-value">{COUNTRY_FLAGS[l.country]} {l.country}</span>
                        </span>
                        <span className="llc-detail-item">
                          <span className="llc-label">Next milestone</span>
                          <span className="llc-value">{l.milestones.find(m => m.status !== 'completed')?.label || 'All complete'}</span>
                        </span>
                        <span className="llc-detail-item">
                          <span className="llc-label">Launch</span>
                          <span className="llc-value">{new Date(l.launchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </span>
                        <span className="llc-detail-item">
                          <span className="llc-label">Readiness</span>
                          <span className="llc-value">{l.completion}%</span>
                        </span>
                      </div>
                      <div className="llc-bar">
                        <div className={`llc-bar-fill ${l.status === 'delayed' ? 'st-delayed' : l.status === 'at-risk' ? 'st-at-risk' : 'st-on-track'}`} style={{ width: `${l.completion}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---- Chart View ---- */}
      {viewMode === 'chart' && (
        <div className="lp-charts">
          <section className="card">
            <h2>Launches by year</h2>
            <div className="lp-chart">
              {launchesByYear.length === 0 ? (
                <div className="lp-empty-inline">No data</div>
              ) : (
                <div className="lp-bar-chart">
                  {launchesByYear.map(([y, count]) => (
                    <div key={y} className="lbc-bar-group">
                      <div className="lbc-bar-container">
                        <div
                          className="lbc-bar"
                          style={{ height: `${(count / maxYear) * 200}px` }}
                        />
                      </div>
                      <div className="lbc-label">{y}</div>
                      <div className="lbc-count">{count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Launches by country</h2>
            <div className="lp-chart">
              {launchesByCountry.length === 0 ? (
                <div className="lp-empty-inline">No data</div>
              ) : (
                <div className="lp-horiz-chart">
                  {launchesByCountry.map(([c, count]) => (
                    <div key={c} className="lhc-row">
                      <div className="lhc-label">{COUNTRY_FLAGS[c]} {c}</div>
                      <div className="lhc-bar-wrapper">
                        <div
                          className="lhc-bar"
                          style={{ width: `${(count / maxCountry) * 100}%` }}
                        />
                      </div>
                      <div className="lhc-count">{count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ---- Modal: Enter Launch ---- */}
      {showModal && (
        <div className="lp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lp-modal" onClick={e => e.stopPropagation()}>
            <div className="lp-modal-head">
              <h2>Enter launch in pipeline</h2>
              <button className="lp-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="lp-modal-body">
              <div className="lp-form-group">
                <label>Therapeutic area</label>
                <select>
                  <option>Oncology</option>
                  <option>R&I</option>
                  <option>Respiratory</option>
                </select>
              </div>
              <div className="lp-form-group">
                <label>Brand name *</label>
                <input type="text" placeholder="e.g. Breztri" />
              </div>
              <div className="lp-form-group">
                <label>Country</label>
                <select>
                  <option>United States</option>
                  <option>Italy</option>
                  <option>Germany</option>
                </select>
              </div>
              <div className="lp-form-row">
                <div className="lp-form-group">
                  <label>Regulatory submission</label>
                  <input type="date" />
                </div>
                <div className="lp-form-group">
                  <label>Regulatory approval</label>
                  <input type="date" />
                </div>
              </div>
              <div className="lp-form-row">
                <div className="lp-form-group">
                  <label>Reimbursement approval</label>
                  <input type="date" />
                </div>
                <div className="lp-form-group">
                  <label>Launch date</label>
                  <input type="date" />
                </div>
              </div>
              <div className="lp-form-group">
                <label>Best case launch date</label>
                <input type="date" />
              </div>
              <div className="lp-form-group">
                <label>Comments</label>
                <textarea rows={3} />
              </div>
            </div>
            <div className="lp-modal-foot">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => setShowModal(false)}>Enter pipeline</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
