import { useState } from 'react';
import type { Route } from '../App';
import { WorkspaceTabs } from './WorkspaceTabs';
import {
  PHASES, getLaunch, getProduct, activityOverview, STATUS_LABELS,
  type Phase, type Status,
} from '../data/mockData';

interface Props {
  launchId: string;
  initialPhase?: Phase;
  navigate: (r: Route) => void;
}

const STATUS_CLASS: Record<Status, string> = {
  'delayed': 'st-delayed', 'at-risk': 'st-at-risk', 'on-track': 'st-on-track',
  'completed': 'st-completed', 'not-started': 'st-not-started', 'not-applicable': 'st-not-applicable',
};

// Card background variant per status (the coloured playbook cards).
const CARD_CLASS: Record<Status, string> = {
  'delayed': 'wac-delayed', 'at-risk': 'wac-at-risk', 'on-track': 'wac-on-track',
  'completed': 'wac-completed', 'not-started': 'wac-not-started', 'not-applicable': 'wac-na',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

export function ActivityOverview({ launchId, initialPhase, navigate }: Props) {
  const launch = getLaunch(launchId);
  const [phase, setPhase] = useState<Phase | 'ALL'>(initialPhase ?? 'ALL');

  if (!launch) return <main className="ao"><p>Launch not found.</p></main>;
  const product = getProduct(launch.productId);
  const columns = activityOverview(launch, phase);

  const monthsToLaunch = Math.round(
    (new Date(launch.launchDate).getTime() - Date.now()) / (1000 * 3600 * 24 * 30.4)
  );
  const lBadge = monthsToLaunch >= 0 ? `L-${monthsToLaunch}` : `L+${-monthsToLaunch}`;

  return (
    <main className="ao">
      <div className="fo-header">
        <div className="legend legend-status">
          {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
            <span key={s}><i className={`dot ${STATUS_CLASS[s]}`} /> {STATUS_LABELS[s]}</span>
          ))}
        </div>
        <div className="fo-header-right">
          <label>Therapy<input readOnly value={product.therapy} /></label>
          <label>Brand<input readOnly value={`${product.brand} | ${product.indication}`} /></label>
          <label>Country<input readOnly value={launch.country} /></label>
        </div>
      </div>

      <div className="fo-dates">
        <span><strong>Dossier Submission:</strong> {fmtDate(launch.dossierSubmission)}</span>
        <span><strong>Regulatory Approval:</strong> {fmtDate(launch.regulatoryApproval)}</span>
        <span><strong>Reimbursement Approval:</strong> {fmtDate(launch.reimbursementApproval)}</span>
        <span><strong>Launch Date:</strong> {fmtDate(launch.launchDate)}</span>
        <span className="l-badge">{lBadge}</span>
      </div>

      <WorkspaceTabs launchId={launchId} current="activity" navigate={navigate} />

      <div className="ao-toolbar">
        <div className="ao-phase-tabs">
          <button className={phase === 'ALL' ? 'phase-active' : ''} onClick={() => setPhase('ALL')}>ALL</button>
          {PHASES.map(p => (
            <button key={p} className={phase === p ? 'phase-active' : ''} onClick={() => setPhase(p)}>{p}</button>
          ))}
        </div>
        <span className="ao-note">Note: <em>Assume HLR is at L-14</em></span>
      </div>

      <div className="ao-grid">
        {columns.map(col => (
          <div key={col.focusArea} className="ao-col">
            <div className="ao-col-head">
              Focus Area {col.num}
              <span>{col.focusArea}</span>
            </div>
            <div className="ao-col-body">
              {col.cells.length === 0 && <div className="wac wac-empty">No activities in this phase</div>}
              {col.cells.map(cell => (
                <button
                  key={cell.workArea}
                  className={`wac ${CARD_CLASS[cell.status]}`}
                  onClick={() => navigate({
                    view: 'tasks', launchId,
                    phase: phase === 'ALL' ? undefined : phase,
                    focusArea: col.focusArea,
                  })}
                  title={`${cell.workArea} — ${STATUS_LABELS[cell.status]} · ${cell.taskCount} ${cell.taskCount === 1 ? 'task' : 'tasks'} · ${cell.completion}%`}
                >
                  <span className="wac-name">{cell.workArea}</span>
                  <span className="wac-meta">
                    {cell.taskCount} {cell.taskCount === 1 ? 'task' : 'tasks'} · {cell.completion}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
