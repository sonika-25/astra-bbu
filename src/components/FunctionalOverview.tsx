import type { Route } from '../App';
import { WorkspaceTabs } from './WorkspaceTabs';
import {
  PHASES, FUNCTIONS, getLaunch, getProduct, STATUS_LABELS,
  type Status,
} from '../data/mockData';

interface Props {
  launchId: string;
  navigate: (r: Route) => void;
}

const STATUS_CLASS: Record<Status, string> = {
  'delayed': 'st-delayed', 'at-risk': 'st-at-risk', 'on-track': 'st-on-track',
  'completed': 'st-completed', 'not-started': 'st-not-started', 'not-applicable': 'st-not-applicable',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

export function FunctionalOverview({ launchId, navigate }: Props) {
  const launch = getLaunch(launchId);
  if (!launch) return <main className="fo"><p>Launch not found.</p></main>;
  const product = getProduct(launch.productId);

  const monthsToLaunch = Math.round(
    (new Date(launch.launchDate).getTime() - Date.now()) / (1000 * 3600 * 24 * 30.4)
  );
  const lBadge = monthsToLaunch >= 0 ? `L-${monthsToLaunch}` : `L+${-monthsToLaunch}`;

  return (
    <main className="fo">
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

      <WorkspaceTabs launchId={launchId} current="functional" navigate={navigate} />

      <div className="fo-matrix">
        {PHASES.map(phase => {
          const isCurrent = phase === launch.currentPhase;
          return (
            <div key={phase} className={`fo-col ${isCurrent ? 'fo-col-current' : ''}`}>
              <div className="fo-col-head">{phase}</div>
              <div className="fo-col-body">
                {FUNCTIONS.map(fn => {
                  const act = launch.activities.find(a => a.phase === phase && a.function === fn);
                  if (!act) return null;
                  if (!act.hasActivities) {
                    return (
                      <div key={fn} className="fn-card fn-card-empty">
                        No Activities for {fn}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={fn}
                      className="fn-card"
                      onClick={() => navigate({ view: 'tasks', launchId, phase, fn })}
                      title={`${fn} · ${phase}: ${STATUS_LABELS[act.status]} — ${act.tasks.length} tasks, ${act.completion}% complete`}
                    >
                      <span className={`mc-badge ${STATUS_CLASS[act.status]}`}>MC</span>
                      <span className="fn-name">{fn}</span>
                      {act.tasks.length > 0 && (
                        <span className="fn-count">{act.tasks.length} {act.tasks.length === 1 ? 'task' : 'tasks'} · {act.completion}%</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
