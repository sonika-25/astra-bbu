import { useEffect, useMemo, useState } from 'react';
import {
  LAUNCHES, FUNCTIONS, getProduct, functionReadiness, attentionTasks, nextMilestone,
  type Status, type BusinessFunction,
} from '../data/mockData';
import { generateExport, saveBlob, type ExportSpec, type ExportArtifact } from '../utils/exporters';

type Tab = 'analytics' | 'report' | 'action' | 'downloads';

interface AnswerLine { label: string; value: string; tone?: 'delayed' | 'at-risk' | 'on-track'; }
interface Answer { title: string; lines: AnswerLine[]; note?: string; }
interface DownloadItem { name: string; desc: string; when: string; blob: Blob; }

const STATUS_LABEL: Record<Status, string> = {
  'delayed': 'Delayed', 'at-risk': 'At risk', 'on-track': 'On track',
  'completed': 'Completed', 'not-started': 'Not started', 'not-applicable': 'N/A',
};
const EDITABLE_STATUSES: Status[] = ['not-started', 'on-track', 'at-risk', 'delayed', 'completed'];

/** Find a launch referenced by brand or country in free text. */
function scopeLaunch(lower: string) {
  return LAUNCHES.find(l =>
    lower.includes(l.country.toLowerCase()) ||
    lower.includes(getProduct(l.productId).brand.toLowerCase()));
}
/** Find a business function referenced in free text. */
function scopeFunction(lower: string): BusinessFunction | undefined {
  return FUNCTIONS.find(f => lower.includes(f.toLowerCase().split(/[ /&]/)[0]));
}

/* ----------------------------- Analytics intent ----------------------------- */
function analyticsAnswer(q: string): Answer {
  const lower = q.toLowerCase().trim();
  const launch = scopeLaunch(lower);
  const fn = scopeFunction(lower);

  // Function-scoped readiness across (optionally one) launch
  if (fn && (lower.includes('ready') || lower.includes('score') || lower.includes('status') || lower.includes('how'))) {
    const scope = launch ? [launch] : LAUNCHES;
    const rows = scope.map(l => ({ l, r: functionReadiness(l).find(x => x.fn === fn) }))
      .filter(x => x.r && x.r.total > 0);
    const avg = rows.length ? Math.round(rows.reduce((s, x) => s + (x.r!.completion), 0) / rows.length) : 0;
    const delayed = rows.reduce((s, x) => s + x.r!.delayed, 0);
    return {
      title: `${fn} readiness${launch ? ` — ${launch.country}` : ' (portfolio)'}`,
      lines: [
        { label: 'Average readiness', value: `${avg}%`, tone: delayed ? 'at-risk' : 'on-track' },
        { label: 'Delayed tasks', value: `${delayed}`, tone: delayed ? 'delayed' : 'on-track' },
        { label: 'Launches covered', value: `${rows.length}` },
      ],
    };
  }

  if (lower.includes('ready') || lower.includes('score') || lower.includes('readiness')) {
    if (launch) {
      const next = nextMilestone(launch);
      return {
        title: `${getProduct(launch.productId).brand} — ${launch.country}`,
        lines: [
          { label: 'Readiness', value: `${launch.completion}%`, tone: launch.status === 'delayed' ? 'delayed' : launch.status === 'at-risk' ? 'at-risk' : 'on-track' },
          { label: 'Phase', value: launch.currentPhase },
          { label: 'Next milestone', value: next ? next.label : 'All complete' },
        ],
      };
    }
    const avg = Math.round(LAUNCHES.reduce((s, l) => s + l.completion, 0) / LAUNCHES.length);
    const onTrack = LAUNCHES.filter(l => l.status === 'on-track' || l.status === 'completed').length;
    return {
      title: 'Portfolio readiness',
      lines: [
        { label: 'Average readiness', value: `${avg}%` },
        { label: 'Launches on track', value: `${onTrack} / ${LAUNCHES.length}`, tone: 'on-track' },
        { label: 'Active launches', value: `${LAUNCHES.length}` },
      ],
    };
  }

  if (lower.includes('risk') || lower.includes('delayed') || lower.includes('attention') || lower.includes('problem')) {
    const scope = launch ? [launch] : LAUNCHES;
    let flagged = scope.flatMap(l => attentionTasks(l).map(t => ({ t, l })));
    if (fn) flagged = flagged.filter(x => x.t.leadFunction === fn);
    const delayed = flagged.filter(x => x.t.status === 'delayed').length;
    const blocked = flagged.filter(x => x.t.handoffStatus === 'blocked').length;
    const scopeLabel = [fn, launch?.country].filter(Boolean).join(' — ');
    return {
      title: scopeLabel ? `Risk — ${scopeLabel}` : 'Portfolio risk',
      lines: [
        { label: 'Flagged activities', value: `${flagged.length}`, tone: flagged.length ? 'delayed' : 'on-track' },
        { label: 'Delayed', value: `${delayed}`, tone: delayed ? 'delayed' : 'on-track' },
        { label: 'Blocked handoffs', value: `${blocked}`, tone: blocked ? 'delayed' : 'on-track' },
      ],
      note: flagged[0] ? `Top item: ${flagged[0].t.name}` : undefined,
    };
  }

  if (lower.includes('kpi') || lower.includes('trend') || lower.includes('indicator') || lower.includes('summary')) {
    const delayed = LAUNCHES.filter(l => l.status === 'delayed').length;
    const atRisk = LAUNCHES.filter(l => l.status === 'at-risk').length;
    return {
      title: 'Portfolio KPIs',
      lines: [
        { label: 'Active launches', value: `${LAUNCHES.length}` },
        { label: 'Delayed', value: `${delayed}`, tone: delayed ? 'delayed' : 'on-track' },
        { label: 'At risk', value: `${atRisk}`, tone: atRisk ? 'at-risk' : 'on-track' },
        { label: 'Avg readiness', value: `${Math.round(LAUNCHES.reduce((s, l) => s + l.completion, 0) / LAUNCHES.length)}%` },
      ],
    };
  }

  return {
    title: 'Not sure what you mean',
    lines: [{ label: 'Try', value: 'readiness, risk, KPIs, or a brand/function' }],
    note: 'e.g. "Breztri readiness", "Medical risk", "portfolio KPIs"',
  };
}

/* ------------------------------- Report intent ------------------------------ */
function typoDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, col) => row === 0 ? col : col === 0 ? row : 0));
  for (let row = 1; row <= a.length; row++) {
    for (let col = 1; col <= b.length; col++) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
      if (row > 1 && col > 1 && a[row - 1] === b[col - 2] && a[row - 2] === b[col - 1]) {
        matrix[row][col] = Math.min(matrix[row][col], matrix[row - 2][col - 2] + 1);
      }
    }
  }
  return matrix[a.length][b.length];
}

function fuzzyIntent(text: string, ...terms: string[]): boolean {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return terms.some(term =>
    tokens.includes(term) ||
    (term.length >= 4 && tokens.some(token => Math.abs(token.length - term.length) <= 1 && typoDistance(token, term) <= 1)));
}

function parseReport(q: string): ExportSpec {
  const lower = q.toLowerCase();
  const ext = fuzzyIntent(lower, 'ppt', 'pptx', 'powerpoint', 'slide', 'deck') ? 'pptx' as const
    : fuzzyIntent(lower, 'excel', 'xlsx', 'spreadsheet', 'sheet') ? 'xlsx' as const
    : fuzzyIntent(lower, 'csv') ? 'csv' as const
    : fuzzyIntent(lower, 'pdf') ? 'pdf' as const : 'pptx' as const;
  const kind = ext === 'pptx' ? 'PowerPoint' : ext === 'xlsx' ? 'Excel' : ext === 'csv' ? 'CSV' : 'PDF';

  const artifact: ExportArtifact = fuzzyIntent(lower, 'gantt') ? 'Gantt chart'
    : fuzzyIntent(lower, 'table', 'list') ? 'Task table'
    : fuzzyIntent(lower, 'timeline') ? 'Milestone timeline'
    : fuzzyIntent(lower, 'calendar') ? 'Launch calendar'
    : fuzzyIntent(lower, 'summary', 'overview') ? 'Launch summary'
    : fuzzyIntent(lower, 'handoff') ? 'Handoff report'
    : 'Task table';

  const fn = scopeFunction(lower);
  const launch = scopeLaunch(lower);
  const scopeParts = [
    fn ? `${fn} tasks` : '',
    launch ? `${getProduct(launch.productId).brand} — ${launch.country}` : '',
  ].filter(Boolean);
  const scopeStr = scopeParts.length ? ` · ${scopeParts.join(' · ')}` : ' · all launches';

  const slug = `${artifact}_${fn ? fn.replace(/[^A-Za-z]/g, '') : ''}${launch ? '_' + launch.country : ''}`
    .replace(/[ ]/g, '-').replace(/_+/g, '_').replace(/_$/, '');
  return { ext, artifact, fn, launch, name: `${slug}.${ext}`, desc: `${artifact}${scopeStr} (${kind})` };
}

/* ================================ Component ================================ */
export function AIAssistant({ defaultOpen = false, embedded = false, activeLaunchId }: {
  defaultOpen?: boolean;
  embedded?: boolean;
  /** The launch currently open in the workspace, if there is one. */
  activeLaunchId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setOpen(defaultOpen); }, [defaultOpen]);
  const [tab, setTab] = useState<Tab>('analytics');

  // Analytics
  const [aInput, setAInput] = useState('');
  const [aAnswer, setAAnswer] = useState<Answer | null>(null);

  // Report + shared downloads
  const [rInput, setRInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  // Action
  const [actLaunchId, setActLaunchId] = useState(LAUNCHES[0]?.id ?? '');
  const [actMode, setActMode] = useState<'status' | 'date'>('status');
  const [actTaskId, setActTaskId] = useState('');
  const [actStatus, setActStatus] = useState<Status>('on-track');
  const [actDate, setActDate] = useState('');
  const [actMsg, setActMsg] = useState('');

  // Open the Action tab in the context of the launch currently being viewed.
  useEffect(() => {
    if (activeLaunchId && LAUNCHES.some(l => l.id === activeLaunchId)) {
      setActLaunchId(activeLaunchId);
      setActTaskId('');
      setActMsg('');
    }
  }, [activeLaunchId]);

  const actLaunch = LAUNCHES.find(l => l.id === actLaunchId);
  const actTasks = useMemo(
    () => actLaunch ? actLaunch.activities.flatMap(a => a.tasks).slice(0, 40) : [],
    [actLaunch],
  );

  function askAnalytics(q: string) {
    if (!q.trim()) return;
    setAAnswer(analyticsAnswer(q));
  }

  async function runReport(q: string) {
    if (!q.trim() || generating) return;
    setGenerating(true);
    const spec = parseReport(q);
    try {
      const blob = await generateExport(spec);
      saveBlob(blob, spec.name); // real browser download
      setDownloads(prev => [{
        name: spec.name, desc: spec.desc, blob,
        when: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      }, ...prev]);
      setRInput('');
      setTab('downloads');
    } finally {
      setGenerating(false);
    }
  }

  function applyAction() {
    if (!actLaunch) return;
    const brand = getProduct(actLaunch.productId).brand;
    if (actMode === 'status') {
      const task = actTasks.find(t => t.id === actTaskId);
      if (!task) { setActMsg('Pick a task first.'); return; }
      task.status = actStatus; // mutate mock data
      if (task.status === 'completed' && task.handoffStatus) task.handoffStatus = 'accepted';
      setActMsg(`✓ "${task.name}" set to ${STATUS_LABEL[actStatus]} on ${brand} — ${actLaunch.country}.`);
    } else {
      if (!actDate) { setActMsg('Pick a date first.'); return; }
      actLaunch.launchDate = actDate; // mutate mock data
      setActMsg(`✓ ${brand} — ${actLaunch.country} launch date set to ${actDate}.`);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!embedded && <button className={`ai-fab ${open ? 'ai-fab-open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="AI assistant">
        {open ? '✕' : '✦'}
      </button>}

      {(open || embedded) && (
        <div className={`ai-panel-float ${embedded ? 'ai-panel-embedded' : ''}`}>
          <div className="ai-pf-head">
            <span className="ai-pf-title"><span className="ai-pf-spark">✦</span> AI Assistant</span>
            <button className="ai-pf-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="ai-pf-tabs">
            {(['analytics', 'report', 'action', 'downloads'] as Tab[]).map(t => (
              <button key={t} className={tab === t ? 'ai-pf-tab ai-pf-tab-on' : 'ai-pf-tab'} onClick={() => setTab(t)}>
                {t === 'analytics' ? 'Analytics' : t === 'report' ? 'Report' : t === 'action' ? 'Action' : 'Downloads'}
                {t === 'downloads' && downloads.length > 0 && <span className="ai-pf-badge">{downloads.length}</span>}
              </button>
            ))}
          </div>

          <div className="ai-pf-body">
            {/* -------- Analytics -------- */}
            {tab === 'analytics' && (
              <div className="ai-tab">
                <p className="ai-tab-hint">Ask about readiness, risk or KPIs — for the portfolio, a brand or a function.</p>
                <div className="ai-chip-row">
                  {['Portfolio readiness', 'Medical risk', 'Portfolio KPIs'].map(c => (
                    <button key={c} className="bot-chip" onClick={() => { setAInput(c); askAnalytics(c); }}>{c}</button>
                  ))}
                </div>
                {aAnswer && (
                  <div className="ai-answer">
                    <div className="ai-answer-title">{aAnswer.title}</div>
                    <ul className="ai-answer-lines">
                      {aAnswer.lines.map((l, i) => (
                        <li key={i}><span>{l.label}</span><span className={l.tone ? `tone-${l.tone}` : ''}>{l.value}</span></li>
                      ))}
                    </ul>
                    {aAnswer.note && <p className="ai-answer-note">{aAnswer.note}</p>}
                  </div>
                )}
                <div className="ai-input-row">
                  <input className="bot-input" placeholder='e.g. "Breztri readiness score"' value={aInput}
                    onChange={e => setAInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAnalytics(aInput)} />
                  <button className="ai-go" onClick={() => askAnalytics(aInput)}>Ask</button>
                </div>
              </div>
            )}

            {/* -------- Report -------- */}
            {tab === 'report' && (
              <div className="ai-tab">
                <p className="ai-tab-hint">Describe the report in plain language. Names the format, artifact and scope for you.</p>
                <div className="ai-chip-row">
                  {['PPT of gantt for medical tasks', 'Excel of task table', 'PDF launch summary for Breztri'].map(c => (
                    <button key={c} className="bot-chip" onClick={() => { setRInput(c); }}>{c}</button>
                  ))}
                </div>
                <div className="ai-input-row">
                  <input className="bot-input" placeholder='e.g. "give me a ppt of gantt of medical tasks"' value={rInput}
                    onChange={e => setRInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runReport(rInput)} disabled={generating} />
                  <button className="ai-go" onClick={() => runReport(rInput)} disabled={generating}>Generate</button>
                </div>
                {generating && <div className="ai-generating"><span className="spinner" /> Generating…</div>}
                {rInput.trim() && !generating && (
                  <p className="ai-report-preview">Will create: <strong>{parseReport(rInput).desc}</strong></p>
                )}
              </div>
            )}

            {/* -------- Action -------- */}
            {tab === 'action' && (
              <div className="ai-tab">
                <p className="ai-tab-hint">Update statuses and dates with simple controls — no typing needed.</p>
                <div className="ai-seg">
                  <button className={actMode === 'status' ? 'ai-seg-on' : ''} onClick={() => { setActMode('status'); setActMsg(''); }}>Update task status</button>
                  <button className={actMode === 'date' ? 'ai-seg-on' : ''} onClick={() => { setActMode('date'); setActMsg(''); }}>Change launch date</button>
                </div>

                <label className="ai-field">{activeLaunchId === actLaunchId ? 'Active project' : 'Launch'}
                  <select value={actLaunchId} onChange={e => { setActLaunchId(e.target.value); setActTaskId(''); setActMsg(''); }}>
                    {LAUNCHES.map(l => <option key={l.id} value={l.id}>{getProduct(l.productId).brand} — {l.country}</option>)}
                  </select>
                </label>

                {actMode === 'status' ? (
                  <>
                    <label className="ai-field">Task
                      <select value={actTaskId} onChange={e => setActTaskId(e.target.value)}>
                        <option value="">Select a task…</option>
                        {actTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </label>
                    <label className="ai-field">New status
                      <select value={actStatus} onChange={e => setActStatus(e.target.value as Status)}>
                        {EDITABLE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </label>
                  </>
                ) : (
                  <label className="ai-field">New launch date
                    <input type="date" value={actDate} onChange={e => setActDate(e.target.value)} />
                  </label>
                )}

                <button className="ai-apply" onClick={applyAction}>Apply changes</button>
                {actMsg && <div className="ai-answer ai-act-msg">{actMsg}</div>}
              </div>
            )}

            {/* -------- Downloads -------- */}
            {tab === 'downloads' && (
              <div className="ai-tab">
                <p className="ai-tab-hint">Exports generated this session.</p>
                {downloads.length === 0 ? (
                  <div className="ai-empty">No exports yet. Generate one from the Report tab.</div>
                ) : (
                  <ul className="ai-dl-list">
                    {downloads.map((d, i) => (
                      <li key={i} className="ai-dl">
                        <span className="file-ic">✓</span>
                        <span className="ai-dl-meta">
                          <span className="ai-dl-name">{d.name}</span>
                          <span className="ai-dl-desc">{d.desc} · {d.when}</span>
                        </span>
                        <button className="ai-dl-btn" onClick={() => saveBlob(d.blob, d.name)}>Download</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
