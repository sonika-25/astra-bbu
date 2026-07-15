import { useMemo, type CSSProperties } from 'react';
import type { Route } from '../App';
import { LAUNCHES, CURRENT_USER, COUNTRY_FLAGS, getProduct, nextMilestone, tasksForOwner, type Status } from '../data/mockData';
import { AIAssistant } from './AIAssistant';

interface Props { navigate: (r: Route) => void; }
const STATUS_LABEL: Record<Status, string> = { delayed: 'Delayed', 'at-risk': 'At risk', 'on-track': 'On track', completed: 'Completed', 'not-started': 'Not started', 'not-applicable': 'N/A' };
function fmtShort(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

export function Home({ navigate }: Props) {
  const firstName = CURRENT_USER.split(' ')[0];
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const stats = useMemo(() => ({ active: LAUNCHES.length, onTrack: LAUNCHES.filter(l => l.status === 'on-track' || l.status === 'completed').length, atRisk: LAUNCHES.filter(l => l.status === 'at-risk').length, delayed: LAUNCHES.filter(l => l.status === 'delayed').length, readiness: Math.round(LAUNCHES.reduce((sum, launch) => sum + launch.completion, 0) / LAUNCHES.length) }), []);
  const upcomingLaunches = useMemo(() => [...LAUNCHES].filter(l => new Date(l.launchDate).getTime() >= Date.now()).sort((a, b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime()).slice(0, 5), []);
  const upcomingTasks = useMemo(() => tasksForOwner(CURRENT_USER).filter(item => item.task.status !== 'completed').sort((a, b) => new Date(a.task.endDate).getTime() - new Date(b.task.endDate).getTime()).slice(0, 5), []);
  const highRiskUpcoming = upcomingTasks.filter(({ task }) => task.status === 'delayed' || task.status === 'at-risk').length;
  const actions: { label: string; note: string; icon: string; route: Route }[] = [
    { label: 'Portfolio overview', note: 'Country matrix and readiness', icon: '⊞', route: { view: 'dashboard' } }, { label: 'My tasks', note: 'Your priority work', icon: '✓', route: { view: 'mytasks' } }, { label: 'Launch pipeline', note: 'Launch dates and milestones', icon: '➤', route: { view: 'pipeline' } }, { label: 'At-risk launches', note: 'Review urgent activity', icon: '⚠', route: { view: 'dashboard', filter: 'at-risk' } }, { label: 'Upcoming launches', note: 'Plan key milestones', icon: '◷', route: { view: 'pipeline', mode: 'calendar', year: new Date().getFullYear() } }, { label: 'Reports & exports', note: 'Use the assistant tools', icon: '⇩', route: { view: 'home' } },
  ];
  return <main className="home-main">
    <section className="home-stats-strip">
      <div className="home-welcome"><h1>{greeting}, {firstName}</h1><p>Launch activity at a glance.</p></div>
      <div className="home-kpi"><strong>{stats.active}</strong><span>Active</span></div>
      <div className="home-kpi"><strong className="home-good">{stats.onTrack}</strong><span>On track</span></div>
      <div className="home-kpi"><strong className="home-warn">{stats.atRisk}</strong><span>At risk</span></div>
      <div className="home-kpi"><strong className="home-risk">{stats.delayed}</strong><span>Delayed</span></div>
      <div className="home-readiness-ring" style={{ '--readiness': `${stats.readiness * 3.6}deg` } as CSSProperties}><strong>{stats.readiness}%</strong><span>Ready</span></div>
    </section>
    <div className="home-grid">
      <section className="home-card home-actions"><div className="home-card-head"><h2>Quick actions</h2><span>6 shortcuts</span></div><div className="home-actions-grid">{actions.map(action => <button key={action.label} onClick={() => navigate(action.route)}><b>{action.icon}</b><strong>{action.label}</strong><span>{action.note}</span><i>→</i></button>)}</div></section>
      <AIAssistant embedded />
      <section className="home-card home-tasks"><div className="home-card-head"><h2>Upcoming tasks</h2><button onClick={() => navigate({ view: 'mytasks' })}>View all</button></div><button className="home-risk-callout" onClick={() => navigate({ view: 'mytasks', filter: 'high-risk' })}><span><b>{highRiskUpcoming}</b> high-risk task{highRiskUpcoming === 1 ? '' : 's'} need attention</span><i>→</i></button><div className="home-list">{upcomingTasks.map(({ task, launch, product }) => <button key={task.id} className="home-task-row" onClick={() => navigate({ view: 'tasks', launchId: launch.id, fn: task.leadFunction })}><i className={`dot st-${task.status === 'delayed' ? 'delayed' : task.status === 'at-risk' ? 'at-risk' : 'on-track'}`} /><span><strong>{task.name}</strong><small>{product.brand} · {launch.country} · {task.leadFunction}</small></span><time>Due {fmtShort(task.endDate)}</time></button>)}</div></section>
      <section className="home-card home-launches"><div className="home-card-head"><h2>Upcoming launches</h2><button onClick={() => navigate({ view: 'pipeline' })}>View pipeline</button></div><div className="home-list">{upcomingLaunches.map(launch => { const product = getProduct(launch.productId); const next = nextMilestone(launch); return <button key={launch.id} className="home-launch-row" onClick={() => navigate({ view: 'summary', launchId: launch.id })}><span className="home-launch-title"><strong>{product.brand}</strong><small>{COUNTRY_FLAGS[launch.country]} {launch.country}</small></span><span className="home-launch-date"><strong>{fmtShort(launch.launchDate)}</strong><small>{next?.label ?? 'All milestones complete'}</small></span><span className={`pill pill-${launch.status}`}>{STATUS_LABEL[launch.status]}</span></button>; })}</div></section>
    </div>
  </main>;
}
