import type { Route } from '../App';
import {
  getLaunch, getProduct, nextMilestone, attentionTasks, functionReadiness,
  handoffs, TASK_TYPE_LABELS,
  type Status, type MilestoneStatus,
} from '../data/mockData';

interface Props {
  launchId: string;
  navigate: (r: Route) => void;
}

const RISK_LABEL: Record<Status, string> = {
  'delayed': 'Delayed', 'at-risk': 'At risk', 'on-track': 'On track',
  'completed': 'Completed', 'not-started': 'Not started', 'not-applicable': 'N/A',
};

const MILESTONE_PILL: Record<MilestoneStatus, string> = {
  'completed': 'pill-completed', 'upcoming': 'pill-upcoming',
  'at-risk': 'pill-at-risk', 'delayed': 'pill-delayed',
};

const MILESTONE_TEXT: Record<MilestoneStatus, string> = {
  'completed': 'Completed', 'upcoming': 'Upcoming', 'at-risk': 'At risk', 'delayed': 'Delayed',
};

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function LaunchSummary({ launchId, navigate }: Props) {
  const launch = getLaunch(launchId);
  if (!launch) return <main className="summary"><p>Launch not found.</p></main>;
  const product = getProduct(launch.productId);

  const next = nextMilestone(launch);
  const attention = attentionTasks(launch);
  const delayedCount = attention.filter(t => t.status === 'delayed').length;
  const readiness = functionReadiness(launch);
  const allHandoffs = handoffs(launch);
  const handoffCounts = {
    accepted: allHandoffs.filter(h => h.task.handoffStatus === 'accepted').length,
    sent: allHandoffs.filter(h => h.task.handoffStatus === 'sent').length,
    blocked: allHandoffs.filter(h => h.task.handoffStatus === 'blocked').length,
  };
  const openHandoffs = allHandoffs
    .filter(h => h.task.handoffStatus !== 'accepted')
    .sort((a, b) =>
      (a.task.handoffStatus === 'blocked' ? 0 : 1) - (b.task.handoffStatus === 'blocked' ? 0 : 1));

  // The plain-English governance answer
  const answer = [
    `${launch.country} is ${launch.completion}% ready.`,
    next ? `${next.label} is the next milestone (${fmtShort(next.date)}).` : 'All governance milestones are complete.',
    delayedCount > 0
      ? `${delayedCount} critical ${delayedCount === 1 ? 'activity is' : 'activities are'} delayed.`
      : 'No critical activities are delayed.',
  ].join(' ');

  return (
    <main className="summary">
      {/* ---------------- Hero ---------------- */}
      <section className="hero card summary-hero-compact">
        <div className="hero-left">
          <h1>{product.brand} — {launch.country}</h1>
          <p className="hero-meta">
            {product.indication} · {product.therapy} · Launch {fmtShort(launch.launchDate)} · Lead: {launch.launchManager}
          </p>
          <p className="hero-answer">{answer}</p>
        </div>
        <div className="hero-right">
          <div className="readiness-big">
            <span className="readiness-num">{launch.completion}%</span>
            <span className="readiness-cap">ready</span>
          </div>
          <span className={`pill pill-${launch.status}`}>{RISK_LABEL[launch.status]}</span>
          <span className="phase-tag">{launch.currentPhase}</span>
        </div>
      </section>

      {/* ---------------- Milestone timeline ---------------- */}
      <section className="card summary-timeline-compact">
        <h2>Governance milestones</h2>
        <div className="timeline">
          {launch.milestones.map((m, i) => (
            <div key={m.key} className="timeline-item">
              {i > 0 && <div className={`timeline-connector ${launch.milestones[i - 1].status === 'completed' ? 'tc-done' : ''}`} />}
              <div className={`timeline-node tn-${m.status}`}>
                {m.status === 'completed' ? '✓' : i + 1}
              </div>
              <div className="timeline-label">
                <strong>{m.label}</strong>
                <span>{fmtShort(m.date)}</span>
                <span className={`pill ${MILESTONE_PILL[m.status]}`}>{MILESTONE_TEXT[m.status]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="summary-view-actions">
        <button className="btn-ghost-navy" onClick={() => navigate({ view: 'tasks', launchId })}>
          Task view
        </button>
        <button className="btn-primary" onClick={() => navigate({ view: 'functional', launchId })}>
          Functional view →
        </button>
      </div>

      <div className="summary-grid">
        {/* ---------------- Needs attention ---------------- */}
        <section className="card summary-nav-card">
          <h2>Needs attention <span className="count-badge">{attention.length}</span></h2>
          {attention.length === 0 && <p className="empty-note">Nothing flagged — all activities on track.</p>}
          <ul className="attention-list">
            {attention.slice(0, 5).map(t => (
              <li key={t.id}>
                <button
                  className="attention-item"
                  onClick={() => navigate({ view: 'tasks', launchId, fn: t.leadFunction })}
                >
                  <span className={`dot st-${t.status === 'delayed' ? 'delayed' : 'at-risk'}`} />
                  <span className="ai-body">
                    <span className="ai-name">{t.name}</span>
                    <span className="ai-meta">
                      {t.leadFunction} · due {fmtShort(t.endDate)} ·{' '}
                      {t.leadOwner ?? <em className="unassigned">Unassigned</em>}
                    </span>
                  </span>
                  <span className="ai-tags">
                    {t.handoffStatus === 'blocked' && <span className="tag tag-blocked">Blocked</span>}
                    {t.origin === 'global' && <span className="tag tag-global">From Global</span>}
                    <span className="tag">{TASK_TYPE_LABELS[t.taskType]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button className="summary-card-action" onClick={() => navigate({ view: 'tasks', launchId })}>
            Task view →
          </button>
        </section>

        {/* ---------------- Readiness by function ---------------- */}
        <section className="card summary-nav-card">
          <h2>Readiness by function</h2>
          <div className="fn-bars">
            {readiness.map(r => (
              <button
                key={r.fn}
                className="fn-bar-row"
                onClick={() => navigate({ view: 'tasks', launchId, fn: r.fn })}
              >
                <span className="fnb-name">{r.fn}</span>
                <span className="fnb-track">
                  <span
                    className={r.delayed > 0 ? 'st-delayed' : r.completion >= 85 ? 'st-on-track' : 'st-at-risk'}
                    style={{ width: `${r.completion}%` }}
                  />
                </span>
                <span className="fnb-pct">{r.completion}%</span>
                <span className="fnb-flags">
                  {r.delayed > 0 && <span className="flag-delayed">{r.delayed} delayed</span>}
                  {r.dueSoon > 0 && <span className="flag-soon">{r.dueSoon} due soon</span>}
                </span>
              </button>
            ))}
          </div>
          <button className="summary-card-action" onClick={() => navigate({ view: 'functional', launchId })}>
            Functional view →
          </button>
        </section>

        {/* ---------------- Global → Market handoffs ---------------- */}
        <section className="card">
          <h2>Global → {launch.country} handoffs</h2>
          <div className="handoff-stats">
            <span className="hs hs-accepted">{handoffCounts.accepted} accepted</span>
            <span className="hs hs-sent">{handoffCounts.sent} awaiting review</span>
            <span className="hs hs-blocked">{handoffCounts.blocked} blocked</span>
          </div>
          {openHandoffs.length === 0 ? (
            <p className="empty-note">All Global deliverables accepted by the market team.</p>
          ) : (
            <ul className="handoff-list">
              {openHandoffs.slice(0, 4).map(({ task, phase }) => (
                <li key={task.id}>
                  <button
                    className="attention-item"
                    onClick={() => navigate({ view: 'tasks', launchId, phase, fn: task.leadFunction })}
                  >
                    <span className={`dot ${task.handoffStatus === 'blocked' ? 'st-delayed' : 'st-at-risk'}`} />
                    <span className="ai-body">
                      <span className="ai-name">{task.name}</span>
                      <span className="ai-meta">
                        {task.leadFunction} · {phase} · Local owner:{' '}
                        {task.leadOwner ?? <em className="unassigned">Unassigned</em>}
                      </span>
                    </span>
                    <span className="ai-tags">
                      <span className={`tag ${task.handoffStatus === 'blocked' ? 'tag-blocked' : 'tag-sent'}`}>
                        {task.handoffStatus === 'blocked' ? 'Blocked' : 'Sent'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </main>
  );
}
