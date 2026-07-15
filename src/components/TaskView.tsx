import { Fragment, useMemo, useState } from 'react';
import type { Route } from '../App';
import { WorkspaceTabs } from './WorkspaceTabs';
import {
  PHASES, FUNCTIONS, FOCUS_AREAS, FOCUS_AREA_NUM, FOCUS_AREA_SHORT,
  getLaunch, getProduct, STATUS_LABELS, TASK_TYPE_LABELS,
  type Phase, type BusinessFunction, type Status, type Task, type Subtask, type FocusArea,
} from '../data/mockData';

interface Props {
  launchId: string;
  initialPhase?: Phase;
  initialFn?: BusinessFunction;
  initialFocusArea?: FocusArea;
  navigate: (r: Route) => void;
}

const STATUS_CLASS: Record<Status, string> = {
  'delayed': 'st-delayed', 'at-risk': 'st-at-risk', 'on-track': 'st-on-track',
  'completed': 'st-completed', 'not-started': 'st-not-started', 'not-applicable': 'st-not-applicable',
};

const EDITABLE_STATUSES: Status[] = ['not-started', 'on-track', 'at-risk', 'delayed', 'completed'];

const OWNER_OPTIONS = [
  'Elena Rossi', 'Marco Bianchi', 'Giulia Romano', 'Andrea Fermi',
  'Sonika Agarwal', 'John Smith', 'Maria Keller', 'Pierre Dubois',
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

// ---- Local (mock) sub-structures for the enhanced detail panel ----
interface Comment { author: string; text: string; date: string; }
type DetailTab = 'details' | 'dependencies' | 'comments';

function seedComments(t: Task): Comment[] {
  const out: Comment[] = [];
  if (t.comments) out.push({ author: t.leadOwner ?? 'System', text: t.comments, date: '01-Apr-2026' });
  return out;
}

function makeTask(name: string, focusArea: FocusArea, workArea: string, fn: BusinessFunction): Task {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `new_${Math.random().toString(36).slice(2, 9)}`,
    name, focusArea, workArea,
    status: 'not-started', completion: 0,
    taskType: 'core', origin: 'local', handoffStatus: 'accepted',
    leadOwner: null, leadFunction: fn, otherFunctions: [],
    startDate: today, endDate: today,
    ownership: 'MC', hasDocument: false, hasSubtasks: false, subtasks: [], linkedToLRI: false,
  };
}

export function TaskView({ launchId, initialPhase, initialFn, initialFocusArea, navigate }: Props) {
  const launch = getLaunch(launchId);
  const [phaseFilter, setPhaseFilter] = useState<Phase | 'ALL'>(initialPhase ?? 'ALL');
  const [fnFilter, setFnFilter] = useState<BusinessFunction | null>(initialFn ?? null);
  const [focusFilter, setFocusFilter] = useState<FocusArea | 'All'>(initialFocusArea ?? 'All');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(initialFocusArea ? [initialFocusArea] : FOCUS_AREAS));
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [expandAllTasks, setExpandAllTasks] = useState(!initialFocusArea);
  const [expandAllSubtasks, setExpandAllSubtasks] = useState(false);
  // Local edits keyed by task id (status / owner overrides)
  const [edits, setEdits] = useState<Record<string, Partial<Task>>>({});
  const [savedMsg, setSavedMsg] = useState(false);

  // Enhanced detail-panel state (all local / mock)
  const [detailTab, setDetailTab] = useState<Record<string, DetailTab>>({});
  const [subtaskState, setSubtaskState] = useState<Record<string, Subtask[]>>({});
  const [subOpen, setSubOpen] = useState<Set<string>>(new Set());
  const [newSubtask, setNewSubtask] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addedTasks, setAddedTasks] = useState<Task[]>([]);
  const [addingIn, setAddingIn] = useState<string | null>(null); // "focusArea|||workArea"
  const [newTaskName, setNewTaskName] = useState('');

  const product = launch ? getProduct(launch.productId) : undefined;

  const tasks = useMemo(() => {
    if (!launch) return [];
    const base = launch.activities
      .filter(a =>
        (phaseFilter === 'ALL' || a.phase === phaseFilter) &&
        (!fnFilter || a.function === fnFilter))
      .flatMap(a => a.tasks)
      .filter(t => focusFilter === 'All' || t.focusArea === focusFilter)
      .map(t => ({ ...t, ...edits[t.id] }));
    // Locally-added tasks (shown regardless of phase since they're brand new)
    const extra = addedTasks
      .filter(t =>
        (focusFilter === 'All' || t.focusArea === focusFilter) &&
        (!fnFilter || t.leadFunction === fnFilter))
      .map(t => ({ ...t, ...edits[t.id] }));
    return [...base, ...extra];
  }, [launch, phaseFilter, fnFilter, focusFilter, edits, addedTasks]);

  if (!launch || !product) return <main className="tv"><p>Launch not found.</p></main>;

  const counts: Record<Status, number> = {
    'delayed': 0, 'at-risk': 0, 'on-track': 0, 'completed': 0, 'not-started': 0, 'not-applicable': 0,
  };
  tasks.forEach(t => { counts[t.status]++; });

  // Group Focus Area → Work Area, keeping only areas that have tasks.
  const byFocus = FOCUS_AREAS.map(fa => {
    const faTasks = tasks.filter(t => t.focusArea === fa);
    const workAreas = [...new Set(faTasks.map(t => t.workArea))].map(wa => ({
      name: wa,
      tasks: faTasks.filter(t => t.workArea === wa),
    }));
    return { focusArea: fa, workAreas, count: faTasks.length };
  }).filter(g => g.count > 0);

  const toggleFocus = (fa: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(fa)) next.delete(fa); else next.add(fa);
      return next;
    });
  };

  const toggleAllTaskGroups = () => {
    if (expandAllTasks) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(byFocus.map(group => group.focusArea)));
    }
    setExpandAllTasks(value => !value);
  };

  const editTask = (id: string, patch: Partial<Task>) => {
    const sourceTask = launch?.activities.flatMap(activity => activity.tasks).find(task => task.id === id);
    if (sourceTask) {
      Object.assign(sourceTask, patch);
      if (sourceTask.status === 'completed' && sourceTask.handoffStatus) sourceTask.handoffStatus = 'accepted';
    }
    setEdits(prev => {
      const nextPatch = { ...prev[id], ...patch };
      // Keep the locally edited task aligned with the portfolio handoff rule.
      if (nextPatch.status === 'completed' && nextPatch.handoffStatus) nextPatch.handoffStatus = 'accepted';
      return { ...prev, [id]: nextPatch };
    });
  };

  const saveTaskEditor = () => {
    if (!editingTask) return;
    const { id, ...patch } = editingTask;
    editTask(id, patch);
    setEditingTask(null);
  };

  const save = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  // ---- Detail-panel helpers ----
  const getSubtasks = (t: Task): Subtask[] => subtaskState[t.id] ?? t.subtasks;
  const getComments = (t: Task): Comment[] => comments[t.id] ?? seedComments(t);

  const toggleAllSubtasks = () => {
    if (expandAllSubtasks) {
      setSubOpen(new Set());
    } else {
      setSubOpen(new Set(tasks.filter(t => getSubtasks(t).length > 0).map(t => t.id)));
    }
    setExpandAllSubtasks(value => !value);
  };

  const toggleSubOpen = (id: string) => {
    setSubOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSubtask = (t: Task, sid: string) => {
    const list = getSubtasks(t).map(s => s.id === sid
      ? { ...s, done: !s.done, status: (!s.done ? 'completed' : 'on-track') as Status, completion: !s.done ? 100 : 0 }
      : s);
    setSubtaskState(prev => ({ ...prev, [t.id]: list }));
  };
  const setSubtaskStatus = (t: Task, sid: string, status: Status) => {
    const list = getSubtasks(t).map(s => s.id === sid
      ? { ...s, status, done: status === 'completed', completion: status === 'completed' ? 100 : s.completion }
      : s);
    setSubtaskState(prev => ({ ...prev, [t.id]: list }));
  };
  const addSubtask = (t: Task) => {
    const text = (newSubtask[t.id] ?? '').trim();
    if (!text) return;
    const sub: Subtask = {
      id: `${t.id}_s${Date.now()}`, name: text, status: 'not-started', completion: 0, done: false,
      leadOwner: t.leadOwner, leadFunction: t.leadFunction, startDate: t.startDate, endDate: t.endDate,
    };
    setSubtaskState(prev => ({ ...prev, [t.id]: [...getSubtasks(t), sub] }));
    setNewSubtask(prev => ({ ...prev, [t.id]: '' }));
  };
  const addComment = (t: Task) => {
    const text = (newComment[t.id] ?? '').trim();
    if (!text) return;
    const list = [...getComments(t), { author: 'Rakshit Rajgopal', text, date: fmtDate(new Date().toISOString()) }];
    setComments(prev => ({ ...prev, [t.id]: list }));
    setNewComment(prev => ({ ...prev, [t.id]: '' }));
  };

  const addTask = (focusArea: FocusArea, workArea: string, fn: BusinessFunction) => {
    const name = newTaskName.trim();
    if (!name) return;
    setAddedTasks(prev => [...prev, makeTask(name, focusArea, workArea, fn)]);
    setNewTaskName('');
    setAddingIn(null);
  };

  return (
    <main className="tv">
      <div className="fo-header">
        <div className="legend legend-status">
          {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
            <span key={s}><i className={`dot ${STATUS_CLASS[s]}`} /> {STATUS_LABELS[s]}</span>
          ))}
        </div>
        <div className="fo-header-right">
          <label>Therapy<input readOnly value={product.therapy} /></label>
          <label>Brand<input readOnly value={product.brand} /></label>
          <label>Country<input readOnly value={launch.country} /></label>
        </div>
      </div>

      <div className="fo-dates">
        <span><strong>Dossier Submission:</strong> {fmtDate(launch.dossierSubmission)}</span>
        <span><strong>Regulatory Approval:</strong> {fmtDate(launch.regulatoryApproval)}</span>
        <span><strong>Reimbursement Approval:</strong> {fmtDate(launch.reimbursementApproval)}</span>
        <span><strong>Launch Date:</strong> {fmtDate(launch.launchDate)}</span>
      </div>

      <WorkspaceTabs launchId={launchId} current="tasks" navigate={navigate} />

      <div className="tv-phase-tabs">
        <button className={phaseFilter === 'ALL' ? 'phase-active' : ''} onClick={() => setPhaseFilter('ALL')}>ALL</button>
        {PHASES.map(p => (
          <button key={p} className={phaseFilter === p ? 'phase-active' : ''} onClick={() => setPhaseFilter(p)}>
            {p}
          </button>
        ))}
        <div className="tv-chips">
          {fnFilter && (
            <span className="chip">
              {fnFilter} <button onClick={() => setFnFilter(null)}>×</button>
            </span>
          )}
          <select
            className="chip-select"
            value={fnFilter ?? ''}
            onChange={e => setFnFilter((e.target.value || null) as BusinessFunction | null)}
          >
            <option value="">Filter function…</option>
            {FUNCTIONS.map(f => <option key={f}>{f}</option>)}
          </select>
          <button className="link" onClick={() => { setFnFilter(null); setFocusFilter('All'); setPhaseFilter('ALL'); }}>
            Clear All
          </button>
        </div>
      </div>

      <div className={`tv-body ${sidebarOpen ? '' : 'tv-body-sidebar-closed'}`}>
        <button className="tv-sidebar-toggle" onClick={() => setSidebarOpen(value => !value)} aria-label={sidebarOpen ? 'Collapse focus areas' : 'Show focus areas'}>
          {sidebarOpen ? '‹' : '›'}
        </button>
        {sidebarOpen && <aside className="tv-sidebar">
          <div className="tv-panel">
            <div className="tv-panel-head">Focus Areas</div>
            <button className={focusFilter === 'All' ? 'tv-nav-active' : ''} onClick={() => setFocusFilter('All')}>All ›</button>
            {FOCUS_AREAS.map(fa => (
              <button key={fa} className={focusFilter === fa ? 'tv-nav-active' : ''} onClick={() => setFocusFilter(fa)}>
                {FOCUS_AREA_NUM[fa]}. {FOCUS_AREA_SHORT[fa]} ›
              </button>
            ))}
          </div>
          <div className="tv-panel">
            <div className="tv-panel-head">Total Tasks <span className="count-pill">{tasks.length}</span></div>
            {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
              <div key={s} className="tv-count-row">
                <span>{STATUS_LABELS[s]}</span>
                <span className={`count-pill ${STATUS_CLASS[s]}`}>{counts[s]}</span>
              </div>
            ))}
          </div>
        </aside>}

        <section className="tv-main">
          <div className="tv-main-head">
            <button className="tv-expand-tasks" onClick={toggleAllTaskGroups}>
              {expandAllTasks ? 'Collapse all tasks' : 'Expand all tasks'}
            </button>
            <button className="tv-expand-subtasks" onClick={toggleAllSubtasks}>
              {expandAllSubtasks ? 'Collapse all subtasks' : 'Expand all subtasks'}
            </button>
            {phaseFilter === 'ALL' ? 'All phases' : phaseFilter}
            {focusFilter !== 'All' && <span className="tv-main-sub"> · {focusFilter}</span>}
            {savedMsg && <span className="saved-msg">✓ Changes saved (demo only)</span>}
          </div>

          {byFocus.length === 0 && <div className="empty-note" style={{ padding: '20px' }}>No tasks match the current filters.</div>}

          {byFocus.map(({ focusArea, workAreas, count }) => (
            <div key={focusArea} className="wa-block">
              <button className="wa-head" onClick={() => toggleFocus(focusArea)}>
                <span><span className="fa-num">FA{FOCUS_AREA_NUM[focusArea]}</span> {focusArea}</span>
                <span className="wa-meta">{count} {count === 1 ? 'task' : 'tasks'} {expanded.has(focusArea) ? '−' : '+'}</span>
              </button>
              {expanded.has(focusArea) && workAreas.map(wa => (
                <div key={wa.name} className="tg-block">
                  <div className="tg-head">
                    <span>{wa.name}</span>
                    <button className="tg-add-task" onClick={() => setAddingIn(`${focusArea}|||${wa.name}`)}>+ Add task</button>
                  </div>
                  <table className="task-table">
                    <thead>
                      <tr>
                        <th></th><th>#</th><th>Doc</th><th className="th-name">Key Task</th>
                        <th>Type</th><th>Origin</th>
                        <th>Status</th><th>Lead Owner</th><th>Lead Function</th>
                        <th>Start</th><th>End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wa.tasks.map((t, i) => (
                        <Fragment key={t.id}>
                          <tr className="task-row" onClick={() => setOpenTask(openTask === t.id ? null : t.id)}>
                            <td className="td-expand" onClick={e => { e.stopPropagation(); toggleSubOpen(t.id); }}>
                              <button className="sub-caret" aria-label="Toggle subtasks">{subOpen.has(t.id) ? '▾' : '▸'}</button>
                              <i className={`dot ${STATUS_CLASS[t.status]}`} />
                            </td>
                            <td>{i + 1}</td>
                            <td>{t.hasDocument ? '📎' : ''}</td>
                            <td className="td-name" onClick={e => e.stopPropagation()}>
                              <><span>{t.name}</span><button className="task-edit-name" onClick={() => setEditingTask({ ...t })} aria-label="Edit task">Edit</button></>
                              {getSubtasks(t).length > 0 && (
                                <button className="subtask-count" onClick={e => { e.stopPropagation(); toggleSubOpen(t.id); }}>
                                  ⑂ {getSubtasks(t).filter(s => s.done).length}/{getSubtasks(t).length}
                                </button>
                              )}
                              {t.linkedToLRI && <span className="task-flag" title="Linked to LRI"> 🔗</span>}
                            </td>
                            <td>
                              <span className={`tag tag-${t.taskType}`}>{TASK_TYPE_LABELS[t.taskType]}</span>
                            </td>
                            <td>
                              {t.origin === 'global'
                                ? <span className={`tag ${t.handoffStatus === 'blocked' ? 'tag-blocked' : t.handoffStatus === 'sent' ? 'tag-sent' : 'tag-global'}`}>
                                    {t.handoffStatus === 'blocked' ? 'Blocked' : t.handoffStatus === 'sent' ? 'Sent' : 'Global'}
                                  </span>
                                : <span className="tag tag-local">Local</span>}
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <select
                                value={t.status}
                                onChange={e => editTask(t.id, { status: e.target.value as Status })}
                              >
                                {EDITABLE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                              </select>
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <select
                                className={t.leadOwner ? '' : 'owner-unassigned'}
                                value={t.leadOwner ?? ''}
                                onChange={e => editTask(t.id, { leadOwner: e.target.value || null })}
                              >
                                <option value="">Unassigned</option>
                                {[...new Set([t.leadOwner, ...OWNER_OPTIONS])].filter(Boolean).map(o => <option key={o!}>{o}</option>)}
                              </select>
                            </td>
                            <td>{t.leadFunction}</td>
                            <td className="td-date">{fmtDate(t.startDate)}</td>
                            <td className="td-date">{fmtDate(t.endDate)}</td>
                          </tr>
                          {subOpen.has(t.id) && getSubtasks(t).map((s, j) => (
                            <tr key={s.id} className="subtask-row">
                              <td className="td-expand"><i className={`dot dot-sm ${STATUS_CLASS[s.status]}`} /></td>
                              <td className="sub-num">{i + 1}.{j + 1}</td>
                              <td onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className="sub-check" checked={s.done} onChange={() => toggleSubtask(t, s.id)} />
                              </td>
                              <td className="td-name td-subname"><span className="sub-indent">└─</span> {s.name}</td>
                              <td><span className="tag tag-sub">Sub</span></td>
                              <td></td>
                              <td onClick={e => e.stopPropagation()}>
                                <select value={s.status} onChange={e => setSubtaskStatus(t, s.id, e.target.value as Status)}>
                                  {EDITABLE_STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                                </select>
                              </td>
                              <td className="td-subowner">{s.leadOwner ?? 'Unassigned'}</td>
                              <td>{s.leadFunction}</td>
                              <td className="td-date">{fmtDate(s.startDate)}</td>
                              <td className="td-date">{fmtDate(s.endDate)}</td>
                            </tr>
                          ))}
                          {subOpen.has(t.id) && (
                            <tr className="subtask-add-row">
                              <td colSpan={3}></td>
                              <td colSpan={8} onClick={e => e.stopPropagation()}>
                                <div className="sub-add">
                                  <input value={newSubtask[t.id] ?? ''} placeholder="Add a subtask" onChange={e => setNewSubtask(prev => ({ ...prev, [t.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSubtask(t)} />
                                  <button onClick={() => addSubtask(t)}>+ Add subtask</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          {openTask === t.id && (
                            <tr className="task-detail-row">
                              <td colSpan={11}>
                                <div className="task-detail">
                                  <div className="task-detail-tabs">
                                    {(['details', 'dependencies', 'comments'] as DetailTab[]).map(tab => (
                                      <button key={tab} className={(detailTab[t.id] ?? 'details') === tab ? 'detail-tab-active' : ''} onClick={() => setDetailTab(prev => ({ ...prev, [t.id]: tab }))}>
                                        {tab === 'details' ? 'Details' : tab === 'dependencies' ? 'Dependencies' : `Comments (${getComments(t).length})`}
                                      </button>
                                    ))}
                                  </div>
                                  {(detailTab[t.id] ?? 'details') === 'dependencies' && <div className="detail-stack"><p className="dependency-note">Mock dependency view</p><div className="dependency-item"><span>Predecessor</span><strong>Market access review</strong><small>Must finish before this task can close</small></div><div className="dependency-item"><span>Successor</span><strong>Launch readiness sign-off</strong><small>Begins after this task is completed</small></div></div>}
                                  {(detailTab[t.id] ?? 'details') === 'comments' && <div className="detail-stack"><div className="comment-list">{getComments(t).length ? getComments(t).map((c, index) => <div key={index} className="comment-item"><strong>{c.author}</strong><span>{c.date}</span><p>{c.text}</p></div>) : <p className="empty-note">No comments yet.</p>}</div><div className="detail-add-row"><input value={newComment[t.id] ?? ''} placeholder="Write a comment" onChange={e => setNewComment(prev => ({ ...prev, [t.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addComment(t)} /><button onClick={() => addComment(t)}>Post</button></div></div>}
                                  {(detailTab[t.id] ?? 'details') === 'details' && <>
                                  <span className="ownership-badge">{t.ownership}</span>
                                  <label>Follow up Date: <input type="date" defaultValue={t.followUpDate ?? ''} /></label>
                                  <label>Follow up With:
                                    <select defaultValue={t.followUpWith ?? ''}>
                                      <option value="">—</option>
                                      {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                  </label>
                                  <label className="detail-comments">Comments:
                                    <input type="text" defaultValue={t.comments ?? ''} placeholder="Add a comment…" />
                                  </label>
                                  </>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                  {addingIn === `${focusArea}|||${wa.name}` && (
                    <div className="add-task-row">
                      <input autoFocus value={newTaskName} placeholder="New task name" onChange={e => setNewTaskName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask(focusArea, wa.name, fnFilter ?? wa.tasks[0]?.leadFunction ?? FUNCTIONS[0])} />
                      <button className="btn-navy" onClick={() => addTask(focusArea, wa.name, fnFilter ?? wa.tasks[0]?.leadFunction ?? FUNCTIONS[0])}>Add task</button>
                      <button className="btn-plain" onClick={() => { setAddingIn(null); setNewTaskName(''); }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="tv-footer">
            <button className="btn-plain" onClick={() => setEdits({})}>Cancel</button>
            <button className="btn-navy" onClick={save}>Save</button>
          </div>
        </section>
      </div>
      {editingTask && <div className="task-editor-overlay" onClick={() => setEditingTask(null)}>
        <section className="task-editor" onClick={e => e.stopPropagation()}>
          <div className="task-editor-head"><div><h2>Edit task</h2><p>Update the task record and save your changes.</p></div><button onClick={() => setEditingTask(null)}>Close</button></div>
          <div className="task-editor-grid">
            <label className="task-editor-wide">Task name<input value={editingTask.name} onChange={e => setEditingTask({ ...editingTask, name: e.target.value })} /></label>
            <label>Focus area<select value={editingTask.focusArea} onChange={e => setEditingTask({ ...editingTask, focusArea: e.target.value as FocusArea })}>{FOCUS_AREAS.map(area => <option key={area}>{area}</option>)}</select></label>
            <label>Work area<input value={editingTask.workArea} onChange={e => setEditingTask({ ...editingTask, workArea: e.target.value })} /></label>
            <label>Status<select value={editingTask.status} onChange={e => setEditingTask({ ...editingTask, status: e.target.value as Status })}>{EDITABLE_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
            <label>Completion %<input type="number" min="0" max="100" value={editingTask.completion} onChange={e => setEditingTask({ ...editingTask, completion: Number(e.target.value) })} /></label>
            <label>Task type<select value={editingTask.taskType} onChange={e => setEditingTask({ ...editingTask, taskType: e.target.value as Task['taskType'] })}><option value="core">Core</option><option value="recommended">Recommended</option><option value="market-specific">Market-specific</option></select></label>
            <label>Origin<select value={editingTask.origin} onChange={e => setEditingTask({ ...editingTask, origin: e.target.value as Task['origin'] })}><option value="local">Local</option><option value="global">Global</option></select></label>
            <label>Handoff status<select value={editingTask.handoffStatus ?? 'accepted'} onChange={e => setEditingTask({ ...editingTask, handoffStatus: e.target.value as NonNullable<Task['handoffStatus']> })}><option value="accepted">Accepted</option><option value="sent">Sent</option><option value="blocked">Blocked</option></select></label>
            <label>Lead owner<select value={editingTask.leadOwner ?? ''} onChange={e => setEditingTask({ ...editingTask, leadOwner: e.target.value || null })}><option value="">Unassigned</option>{OWNER_OPTIONS.map(owner => <option key={owner}>{owner}</option>)}</select></label>
            <label>Lead function<select value={editingTask.leadFunction} onChange={e => setEditingTask({ ...editingTask, leadFunction: e.target.value as BusinessFunction })}>{FUNCTIONS.map(fn => <option key={fn}>{fn}</option>)}</select></label>
            <label>Start date<input type="date" value={editingTask.startDate} onChange={e => setEditingTask({ ...editingTask, startDate: e.target.value })} /></label>
            <label>End date<input type="date" value={editingTask.endDate} onChange={e => setEditingTask({ ...editingTask, endDate: e.target.value })} /></label>
            <label>Ownership<select value={editingTask.ownership} onChange={e => setEditingTask({ ...editingTask, ownership: e.target.value as Task['ownership'] })}><option value="MC">MC</option><option value="Global">Global</option><option value="Collaboration">Collaboration</option></select></label>
            <label>Follow-up date<input type="date" value={editingTask.followUpDate ?? ''} onChange={e => setEditingTask({ ...editingTask, followUpDate: e.target.value })} /></label>
            <label>Follow-up with<input value={editingTask.followUpWith ?? ''} onChange={e => setEditingTask({ ...editingTask, followUpWith: e.target.value })} /></label>
            <label className="task-editor-wide">Comments<textarea value={editingTask.comments ?? ''} onChange={e => setEditingTask({ ...editingTask, comments: e.target.value })} /></label>
          </div>
          <div className="task-editor-checks"><label><input type="checkbox" checked={editingTask.hasDocument} onChange={e => setEditingTask({ ...editingTask, hasDocument: e.target.checked })} /> Document attached</label><label><input type="checkbox" checked={editingTask.hasSubtasks} onChange={e => setEditingTask({ ...editingTask, hasSubtasks: e.target.checked })} /> Has subtasks</label><label><input type="checkbox" checked={editingTask.linkedToLRI} onChange={e => setEditingTask({ ...editingTask, linkedToLRI: e.target.checked })} /> Linked to LRI</label></div>
          <div className="task-editor-foot"><button className="btn-plain" onClick={() => setEditingTask(null)}>Cancel</button><button className="btn-navy" onClick={saveTaskEditor}>Save task</button></div>
        </section>
      </div>}
    </main>
  );
}
