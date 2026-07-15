// ============================================================================
// LaunchPAL Mock Data
// Hierarchy: Product → Launch (per market) → FunctionalActivity (function ×
// phase) → Task (grouped by Work Area → Task Group)
// All drill-down data is generated deterministically from a seed, so every
// cell on the Overview Dashboard has a complete Functional Overview and
// Task View behind it.
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type Status =
  | 'delayed'        // red    – high risk / delayed
  | 'at-risk'        // amber  – at risk of delays
  | 'on-track'       // green  – on track
  | 'completed'      // blue   – completed
  | 'not-started'    // grey   – not started
  | 'not-applicable' // dark grey – N/A

export const STATUS_LABELS: Record<Status, string> = {
  'delayed': 'High risk / delayed',
  'at-risk': 'At risk of delays',
  'on-track': 'On track',
  'completed': 'Completed',
  'not-started': 'Not Started',
  'not-applicable': 'Not Applicable',
};

export const PHASES = [
  'L-48 to L-36',
  'L-36 to L-24',
  'L-24 to L-18',
  'L-18 to L-12',
  'L-12 to L-6',
  'L-6 to Launch',
] as const;
export type Phase = (typeof PHASES)[number];

export const FUNCTIONS = [
  'Medical',
  'Marketing',
  'Gov & Corp Affairs Policy',
  'Market Access & Pricing',
  'R&D',
  'SFE/IBEX/ComEx',
] as const;
export type BusinessFunction = (typeof FUNCTIONS)[number];

// ----------------------------------------------------------------------------
// Launch Playbook taxonomy
// The playbook organises every activity under 7 Focus Areas. Each Focus Area
// contains a set of Work Areas (the cards on the Activity Overview). Tasks hang
// off a Work Area. This is the structure shown on the "Activity Overview" tab.
// ----------------------------------------------------------------------------

export const FOCUS_AREAS = [
  'Enabling Commercial Success',
  'Enabling Medical Success',
  'Enabling Diagnostics',
  'Enabling Access',
  'Ensuring Physical Availability',
  'Building the Team',
  'Preparing for & Measuring Success',
] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

/** Short labels for compact chips / filters. */
export const FOCUS_AREA_SHORT: Record<FocusArea, string> = {
  'Enabling Commercial Success': 'Commercial',
  'Enabling Medical Success': 'Medical',
  'Enabling Diagnostics': 'Diagnostics',
  'Enabling Access': 'Access',
  'Ensuring Physical Availability': 'Supply',
  'Building the Team': 'Team',
  'Preparing for & Measuring Success': 'Launch Excellence',
};

/** Focus Area number as shown on the playbook (Focus Area 1 … 7). */
export const FOCUS_AREA_NUM: Record<FocusArea, number> = {
  'Enabling Commercial Success': 1,
  'Enabling Medical Success': 2,
  'Enabling Diagnostics': 3,
  'Enabling Access': 4,
  'Ensuring Physical Availability': 5,
  'Building the Team': 6,
  'Preparing for & Measuring Success': 7,
};

/** Work Areas (playbook activities) under each Focus Area — the cards,
 *  exactly as they appear on the LaunchPAL Activity Overview. */
export const WORK_AREAS: Record<FocusArea, string[]> = {
  'Enabling Commercial Success': [
    'Market & Stakeholder Insights Generated',
    'Brand & Media External Communications Developed',
    'Brand Strategies & Plans Communicated',
  ],
  'Enabling Medical Success': [
    'Develop Global Strategy',
    'Ensure Engagement & Insights',
    'Enable Scientific Exchange',
    'Generate Evidence',
  ],
  'Enabling Diagnostics': [
    'Lab & Testing Landscape Insights',
    'Diagnostics Demand Creation/Market Shaping',
    'Availability of Multiple Diagnostics Solutions',
    'Diagnostics Reimbursement and Market Solutions',
  ],
  'Enabling Access': [
    'Develop Payer Value-Driver Insights',
    'Define Payer Value Story',
    'Create Health Economics Modeling & Payer Value Pack',
    'Establish Pricing Committee Endorsed Price',
    'Initiate Payer Stakeholder Engagement Plan',
  ],
  'Ensuring Physical Availability': [
    'Develop Robust Volume Forecasts (including Active Pharmaceutical Ingredient (API))',
    'Complete Supply Chain and Stocking Plans',
    'Ensure Inclusion on Priority Formularies and Protocols',
  ],
  'Building the Team': [
    'Implement Internal Communications',
  ],
  'Preparing for & Measuring Success': [
    'Define Pre-Launch KPIs',
    'Establish Post-Launch System, Processes, & KPIs',
    'Establish Optimal Ways of Working',
  ],
};

/** Which Focus Areas each business function contributes activities to. */
const FUNCTION_FOCUS: Record<BusinessFunction, FocusArea[]> = {
  'Medical': ['Enabling Medical Success', 'Enabling Diagnostics'],
  'Marketing': ['Enabling Commercial Success'],
  'Gov & Corp Affairs Policy': ['Enabling Access', 'Preparing for & Measuring Success'],
  'Market Access & Pricing': ['Enabling Access'],
  'R&D': ['Enabling Diagnostics', 'Enabling Medical Success'],
  'SFE/IBEX/ComEx': ['Building the Team', 'Ensuring Physical Availability', 'Enabling Commercial Success'],
};

export type TaskType = 'core' | 'recommended' | 'market-specific';
export type TaskOrigin = 'global' | 'local';
export type HandoffStatus = 'sent' | 'accepted' | 'blocked';

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  'core': 'Core',
  'recommended': 'Recommended',
  'market-specific': 'Market-specific',
};

/** A subtask is a mini-task: a concrete step of its parent, with its own
 *  status/owner/dates. Every task ships with a few pre-generated ones. */
export interface Subtask {
  id: string;
  name: string;
  status: Status;
  completion: number;
  done: boolean;
  leadOwner: string | null;
  leadFunction: BusinessFunction;
  startDate: string;
  endDate: string;
}

export interface Task {
  id: string;
  name: string;
  focusArea: FocusArea;
  workArea: string;
  status: Status;
  completion: number;          // 0-100
  taskType: TaskType;
  origin: TaskOrigin;
  handoffStatus?: HandoffStatus; // only for origin === 'global'
  leadOwner: string | null;    // null → unassigned
  leadFunction: BusinessFunction;
  otherFunctions: string[];
  startDate: string;           // ISO
  endDate: string;             // ISO
  ownership: 'MC' | 'Global' | 'Collaboration';
  hasDocument: boolean;
  hasSubtasks: boolean;
  subtasks: Subtask[];
  linkedToLRI: boolean;        // linked to Launch Readiness Indicator
  followUpDate?: string;
  followUpWith?: string;
  comments?: string;
}

// ----------------------------------------------------------------------------
// Status model — a launch's readiness is COMPUTED from its task statuses.
// Each status carries a weight; readiness = Σ weight / (task count × max weight).
// Tune the whole model here.
// ----------------------------------------------------------------------------

export const STATUS_WEIGHT: Record<Status, number> = {
  'not-started': 0,
  'delayed': 1,
  'at-risk': 2,
  'on-track': 3,
  'completed': 4,
  'not-applicable': 0, // excluded from the denominator, see computeReadiness
};
export const MAX_STATUS_WEIGHT = 4;

/** Readiness % for a launch: weighted task score over the max possible. N/A tasks excluded. */
export function computeReadiness(launch: Launch): number {
  const tasks = launch.activities.flatMap(a => a.tasks).filter(t => t.status !== 'not-applicable');
  if (tasks.length === 0) return 0;
  const sum = tasks.reduce((s, t) => s + STATUS_WEIGHT[t.status], 0);
  return Math.round((sum / (tasks.length * MAX_STATUS_WEIGHT)) * 100);
}

/** Launch status derived from readiness + whether real delayed work exists.
 *  "Delayed" is reserved for launches that are both low-scoring AND carrying
 *  overdue tasks, so a merely early launch reads "at risk", never red. */
export function computeLaunchStatus(launch: Launch): Status {
  const tasks = launch.activities.flatMap(a => a.tasks).filter(t => t.status !== 'not-applicable');
  if (tasks.length === 0) return 'not-applicable';
  if (tasks.every(t => t.status === 'completed')) return 'completed';
  const readiness = computeReadiness(launch);
  if (readiness >= 80) return 'on-track';
  if (readiness >= 55) return 'at-risk';
  // Below 55%: red if real overdue work exists, amber otherwise.
  return tasks.some(t => t.status === 'delayed') ? 'delayed' : 'at-risk';
}

/** Objective task status from progress + dates: an overdue-and-incomplete task
 *  is delayed; one due within a month is at risk. Completed/not-started stick. */
export function deriveTaskStatus(status: Status, completion: number, endDate: string): Status {
  if (status === 'not-applicable') return 'not-applicable';
  if (status === 'completed' || completion >= 100) return 'completed';
  const end = new Date(endDate).getTime();
  const now = TODAY.getTime();
  const MONTH = 30 * 24 * 3600 * 1000;
  if (end < now) return 'delayed';
  if (end < now + MONTH) return 'at-risk';
  if (status === 'not-started' && completion === 0) return 'not-started';
  // Not overdue, not imminent: any prior risk flag relaxes to on-track.
  return (status === 'delayed' || status === 'at-risk') ? 'on-track' : status;
}

export interface FunctionalActivity {
  id: string;
  function: BusinessFunction;
  phase: Phase;
  status: Status;
  completion: number;
  hasActivities: boolean;      // false → "No Activities for X" empty state
  tasks: Task[];
}

export type MilestoneStatus = 'completed' | 'upcoming' | 'at-risk' | 'delayed';

export interface Milestone {
  key: string;
  label: string;
  date: string;                // ISO
  status: MilestoneStatus;
}

export interface Launch {
  id: string;
  productId: string;
  country: string;             // 'Global' or a country name
  status: Status;              // rocket colour
  currentPhase: Phase;
  completion: number;          // readiness %
  launchDate: string;          // ISO
  launchLabel: string;         // e.g. "Dec/25"
  dossierSubmission: string;
  regulatoryApproval: string;
  reimbursementApproval: string;
  milestones: Milestone[];
  launchManager: string;
  activities: FunctionalActivity[];
}

export interface Product {
  id: string;
  code: string;                // e.g. AZD0120
  indication: string;
  tumor: string;
  brand: string;
  therapy: string;             // e.g. Oncology, R&I
  archetype: string;
}

// ----------------------------------------------------------------------------
// Seeded PRNG so data is stable across reloads
// ----------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// ----------------------------------------------------------------------------
// Static definitions
// ----------------------------------------------------------------------------

export const COUNTRIES = ['US', 'Germany', 'France', 'Spain', 'UK', 'Japan', 'Italy', 'Canada', 'Brazil', 'China', 'Russia'] as const;
export const MATRIX_COLUMNS = ['Global', ...COUNTRIES] as const;

export const COUNTRY_FLAGS: Record<string, string> = {
  Global: '🌍', US: '🇺🇸', Germany: '🇩🇪', France: '🇫🇷',
  Spain: '🇪🇸', UK: '🇬🇧', Japan: '🇯🇵', Italy: '🇮🇹',
};

Object.assign(COUNTRY_FLAGS, {
  Canada: '🇨🇦', Brazil: '🇧🇷', China: '🇨🇳', Russia: '🇷🇺',
});

export const PRODUCTS: Product[] = [
  { id: 'p1', code: 'AZD0120', indication: 'BCMA CD19 CAR-T NDMM TE', tumor: 'Multiple Myeloma', brand: 'Myeloka', therapy: 'Oncology', archetype: 'Wave' },
  { id: 'p2', code: 'AZD0305', indication: 'GPRC5D in 4L+ RR MM post BCMA', tumor: 'Multiple Myeloma', brand: 'Lenmarqa', therapy: 'Oncology', archetype: 'Spark' },
  { id: 'p3', code: 'AZD0901', indication: 'CLARITY-Gastric01', tumor: 'Gastric Cancer', brand: 'Claritas', therapy: 'Oncology', archetype: 'Wave' },
  { id: 'p4', code: 'AZD0502', indication: 'EGFR x MET TQB1 NSCLC', tumor: 'Lung Cancer', brand: 'Tavrexa', therapy: 'Oncology', archetype: 'Surge' },
  { id: 'p5', code: 'AZD1156', indication: 'TROP2 ADC HR+/HER2- mBC', tumor: 'Breast Cancer', brand: 'Trovanta', therapy: 'Oncology', archetype: 'Wave' },
  { id: 'p6', code: 'BREZ01', indication: 'COPD Triple Therapy', tumor: '—', brand: 'Breztri', therapy: 'R&I', archetype: 'Spark' },
];

// Which markets each product launches in
const PRODUCT_MARKETS: Record<string, string[]> = {
  p1: ['Global'],
  p2: ['US', 'Japan', 'Russia'],
  p3: ['US', 'Germany', 'Canada'],
  p4: ['US', 'Spain', 'UK', 'Brazil'],
  p5: ['Global', 'US', 'France', 'Japan', 'China'],
  p6: ['Italy', 'Germany', 'France', 'UK'],
};

const OWNERS = [
  'Elena Rossi', 'Marco Bianchi', 'Giulia Romano', 'Andrea Fermi',
  'Sonika Agarwal', 'John Smith', 'Maria Keller', 'Pierre Dubois',
  'Akiko Tanaka', 'Carlos Vega', 'Emma Clarke', 'Lars Nielsen',
];

// Task name templates keyed by function
const TASK_NAMES: Record<BusinessFunction, string[]> = {
  'Medical': [
    'Validate centrally provided experience map in your market',
    'Develop local KOL engagement plan',
    'Conduct advisory board on treatment landscape',
    'Localise integrated evidence generation plan',
    'Prepare medical education curriculum',
    'Map patient journey with local clinical experts',
    'Review investigator-sponsored study proposals',
  ],
  'Marketing': [
    'Develop local brand positioning & messaging',
    'Adapt global campaign assets for market',
    'Build pre-launch disease awareness campaign',
    'Define customer segmentation & targeting',
    'Prepare launch event & congress plan',
    'Develop omnichannel engagement strategy',
  ],
  'Gov & Corp Affairs Policy': [
    'Map policy environment & access barriers',
    'Develop government affairs engagement plan',
    'Prepare policy shaping white paper',
    'Engage national health authority stakeholders',
    'Monitor legislative changes affecting access',
  ],
  'Market Access & Pricing': [
    'Develop local pricing & reimbursement strategy',
    'Prepare HTA submission dossier',
    'Conduct payer value proposition testing',
    'Model budget impact for national payers',
    'Negotiate managed entry agreement framework',
    'Validate value dossier with regional payers',
  ],
  'R&D': [
    'Confirm local regulatory data requirements',
    'Support local label negotiation',
    'Plan post-approval evidence commitments',
    'Coordinate local clinical trial site readiness',
  ],
  'SFE/IBEX/ComEx': [
    'Design field force sizing & structure',
    'Build incentive compensation framework',
    'Prepare CRM & data infrastructure',
    'Develop sales force training program',
    'Set up performance dashboards & KPIs',
  ],
};

// ----------------------------------------------------------------------------
// Generator
// ----------------------------------------------------------------------------

const STATUS_RANK: Record<Status, number> = {
  'delayed': 0, 'at-risk': 1, 'not-started': 2, 'on-track': 3, 'completed': 4, 'not-applicable': 5,
};

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  const m = d.toLocaleString('en', { month: 'short' });
  return `${m}/${String(d.getFullYear()).slice(2)}`;
}

// Month offsets (before launch) covered by each phase
const PHASE_WINDOWS: Record<Phase, [number, number]> = {
  'L-48 to L-36': [48, 36],
  'L-36 to L-24': [36, 24],
  'L-24 to L-18': [24, 18],
  'L-18 to L-12': [18, 12],
  'L-12 to L-6': [12, 6],
  'L-6 to Launch': [6, 0],
};

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function generateTasks(
  rnd: () => number,
  launchId: string,
  fn: BusinessFunction,
  phase: Phase,
  phaseIdx: number,
  currentPhaseIdx: number,
  launchDate: Date,
  health: number, // 0 (struggling) .. 1 (healthy)
): Task[] {
  const count = 2 + Math.floor(rnd() * 4); // 2-5 tasks
  const tasks: Task[] = [];
  const [startOff, endOff] = PHASE_WINDOWS[phase];

  for (let i = 0; i < count; i++) {
    const focusArea = pick(rnd, FUNCTION_FOCUS[fn]);
    const workArea = pick(rnd, WORK_AREAS[focusArea]);
    const name = pick(rnd, TASK_NAMES[fn]);

    // Status depends on where the phase sits relative to "now"
    let status: Status;
    let completion: number;
    if (phaseIdx < currentPhaseIdx) {
      // Past phase: mostly done, unhealthy launches leave stragglers
      if (rnd() < 0.75 + health * 0.2) { status = 'completed'; completion = 100; }
      else { status = 'delayed'; completion = 30 + Math.floor(rnd() * 40); }
    } else if (phaseIdx === currentPhaseIdx) {
      const roll = rnd();
      if (roll < 0.25 * (1 - health) + 0.05) { status = 'delayed'; completion = 10 + Math.floor(rnd() * 40); }
      else if (roll < 0.45 * (1 - health) + 0.15) { status = 'at-risk'; completion = 40 + Math.floor(rnd() * 35); }
      else if (roll < 0.75) { status = 'on-track'; completion = 50 + Math.floor(rnd() * 45); }
      else if (roll < 0.88) { status = 'completed'; completion = 100; }
      else { status = 'not-started'; completion = 0; }
    } else {
      status = 'not-started'; completion = 0;
    }

    const start = addMonths(launchDate, -startOff + Math.floor(rnd() * 3));
    const end = addMonths(launchDate, -endOff - Math.floor(rnd() * 2));
    const owner = pick(rnd, OWNERS);
    const needsFollowUp = status === 'delayed' || status === 'at-risk';

    const typeRoll = rnd();
    const taskType: TaskType = typeRoll < 0.55 ? 'core' : typeRoll < 0.85 ? 'recommended' : 'market-specific';
    const origin: TaskOrigin = rnd() < 0.35 ? 'global' : 'local';
    const handoffRoll = rnd();
    const handoffStatus: HandoffStatus | undefined = origin === 'global'
      ? (handoffRoll < 0.7 ? 'accepted' : handoffRoll < 0.92 ? 'sent' : 'blocked')
      : undefined;

    tasks.push({
      id: `${launchId}_${phaseIdx}_f${FUNCTIONS.indexOf(fn)}_${i}`,
      name,
      focusArea,
      workArea,
      status,
      completion,
      taskType,
      origin,
      handoffStatus,
      leadOwner: handoffStatus === 'blocked' && rnd() < 0.5 ? null : owner,
      leadFunction: fn,
      otherFunctions: rnd() < 0.5 ? ['Insights & Analytics'] : [],
      startDate: isoDate(start),
      endDate: isoDate(end),
      ownership: rnd() < 0.6 ? 'MC' : rnd() < 0.5 ? 'Global' : 'Collaboration',
      hasDocument: rnd() < 0.4,
      hasSubtasks: true,
      subtasks: [], // filled in the normalization pass below
      linkedToLRI: rnd() < 0.3,
      followUpDate: needsFollowUp ? isoDate(addMonths(new Date('2026-07-14'), 1)) : undefined,
      followUpWith: needsFollowUp ? pick(rnd, OWNERS) : undefined,
      comments: needsFollowUp ? 'Escalated at cross-functional launch team meeting.' : undefined,
    });
  }
  return tasks;
}

// Generic sub-steps every deliverable breaks down into.
const SUBTASK_STEPS = [
  'Draft initial version',
  'Align with cross-functional stakeholders',
  'Circulate for internal review',
  'Incorporate feedback',
  'Finalise & obtain sign-off',
];

/** Pre-generate 2–3 subtasks for a task, dated across its window and with
 *  statuses that roll up toward the parent (deterministic per task id). */
function generateSubtasks(parent: Task): Subtask[] {
  const rnd = mulberry32(hashCode(parent.id + '_sub'));
  const n = 2 + Math.floor(rnd() * 2); // 2-3
  const start = new Date(parent.startDate).getTime();
  const end = new Date(parent.endDate).getTime();
  const span = Math.max(end - start, 24 * 3600 * 1000);
  const out: Subtask[] = [];
  for (let i = 0; i < n; i++) {
    const s = new Date(start + (span * i) / n);
    const e = new Date(start + (span * (i + 1)) / n);
    let status: Status;
    let done: boolean;
    let completion: number;
    if (parent.status === 'completed') { status = 'completed'; done = true; completion = 100; }
    else if (parent.status === 'not-started') { status = 'not-started'; done = false; completion = 0; }
    else if (i / n < parent.completion / 100) { status = 'completed'; done = true; completion = 100; }
    else { status = deriveTaskStatus('on-track', 0, isoDate(e)); done = false; completion = 0; }
    out.push({
      id: `${parent.id}_sub_${i}`,
      name: SUBTASK_STEPS[i % SUBTASK_STEPS.length],
      status, completion, done,
      leadOwner: parent.leadOwner,
      leadFunction: parent.leadFunction,
      startDate: isoDate(s),
      endDate: isoDate(e),
    });
  }
  return out;
}

/** Recompute every task's date-driven status, fill subtasks, and roll the
 *  result up into activity + launch readiness using the weighted model. */
function normalizeLaunch(launch: Launch): void {
  for (const a of launch.activities) {
    for (const t of a.tasks) {
      t.status = deriveTaskStatus(t.status, t.completion, t.endDate);
      if (!t.subtasks || t.subtasks.length === 0) t.subtasks = generateSubtasks(t);
      t.hasSubtasks = t.subtasks.length > 0;
      // Completed Global work has necessarily been accepted by the market.
      if (t.status === 'completed' && t.handoffStatus) t.handoffStatus = 'accepted';
    }
    if (a.tasks.length > 0) {
      const rolled = rollUp(a.tasks);
      a.status = rolled.status;
      a.completion = rolled.completion;
    }
  }
  launch.completion = computeReadiness(launch);
  launch.status = computeLaunchStatus(launch);
}

function rollUp(tasks: Task[]): { status: Status; completion: number } {
  if (tasks.length === 0) return { status: 'not-applicable', completion: 0 };
  const worst = tasks.reduce<Status>((acc, t) =>
    STATUS_RANK[t.status] < STATUS_RANK[acc] ? t.status : acc, 'not-applicable');
  const completion = Math.round(tasks.reduce((s, t) => s + t.completion, 0) / tasks.length);
  if (tasks.every(t => t.status === 'completed')) return { status: 'completed', completion: 100 };
  if (tasks.every(t => t.status === 'not-started')) return { status: 'not-started', completion: 0 };
  return { status: worst === 'not-applicable' ? 'on-track' : worst, completion };
}

const TODAY = new Date('2026-07-14');

function generateLaunch(
  product: Product,
  country: string,
  overrides?: { launchDate?: Date; health?: number },
): Launch {
  const id = `${product.id}_${country.toLowerCase().replace(/\s/g, '')}`;
  const rnd = mulberry32(hashCode(id));

  // Launch date between ~now-2mo and now+30mo (today ≈ Jul 2026)
  const launchDate = overrides?.launchDate ?? addMonths(new Date('2026-07-01'), -2 + Math.floor(rnd() * 32));
  const monthsToLaunch = (launchDate.getTime() - TODAY.getTime()) / (1000 * 3600 * 24 * 30.4);
  const currentPhaseIdx = monthsToLaunch <= 6 ? 5
    : monthsToLaunch <= 12 ? 4
    : monthsToLaunch <= 18 ? 3
    : monthsToLaunch <= 24 ? 2
    : monthsToLaunch <= 36 ? 1 : 0;
  const healthRoll = rnd();
  const health = overrides?.health ?? healthRoll; // how well this launch is going

  const activities: FunctionalActivity[] = [];
  for (let pi = 0; pi < PHASES.length; pi++) {
    for (const fn of FUNCTIONS) {
      // Some function/phase combos have no activities or are N/A
      const naRoll = rnd();
      if (fn === 'R&D' && pi >= 3 && naRoll < 0.6) {
        activities.push({ id: `${id}_fa_${pi}_${fn}`, function: fn, phase: PHASES[pi], status: 'not-applicable', completion: 0, hasActivities: true, tasks: [] });
        continue;
      }
      if (naRoll < 0.08) {
        activities.push({ id: `${id}_fa_${pi}_${fn}`, function: fn, phase: PHASES[pi], status: 'not-started', completion: 0, hasActivities: false, tasks: [] });
        continue;
      }
      const tasks = generateTasks(rnd, id, fn, PHASES[pi], pi, currentPhaseIdx, launchDate, health);
      const { status, completion } = rollUp(tasks);
      activities.push({ id: `${id}_fa_${pi}_${fn}`, function: fn, phase: PHASES[pi], status, completion, hasActivities: true, tasks });
    }
  }

  const withTasks = activities.filter(a => a.hasActivities && a.tasks.length > 0);
  const completion = Math.round(withTasks.reduce((s, a) => s + a.completion, 0) / Math.max(1, withTasks.length));
  const anyDelayed = withTasks.some(a => a.status === 'delayed');
  const anyAtRisk = withTasks.some(a => a.status === 'at-risk');
  const status: Status = completion >= 85 ? 'on-track'
    : anyDelayed && completion < 50 ? 'delayed'
    : anyAtRisk || anyDelayed ? 'at-risk'
    : 'on-track';

  const dossierSubmission = isoDate(addMonths(launchDate, -14));
  const regulatoryApproval = isoDate(addMonths(launchDate, -7));
  const reimbursementApproval = isoDate(addMonths(launchDate, -2));

  const milestoneDefs = [
    { key: 'dossier', label: 'Dossier Submission', date: dossierSubmission },
    { key: 'regulatory', label: 'Regulatory Approval', date: regulatoryApproval },
    { key: 'reimbursement', label: 'Reimbursement Approval', date: reimbursementApproval },
    { key: 'launch', label: 'Launch', date: isoDate(launchDate) },
  ];
  let flaggedNext = false;
  const milestones: Milestone[] = milestoneDefs.map(m => {
    if (new Date(m.date) < TODAY) return { ...m, status: 'completed' as MilestoneStatus };
    // First future milestone inherits the launch's health as its risk signal
    if (!flaggedNext) {
      flaggedNext = true;
      const s: MilestoneStatus = status === 'delayed' ? 'delayed' : status === 'at-risk' ? 'at-risk' : 'upcoming';
      return { ...m, status: s };
    }
    return { ...m, status: 'upcoming' as MilestoneStatus };
  });

  return {
    id,
    productId: product.id,
    country,
    status,
    currentPhase: PHASES[currentPhaseIdx],
    completion,
    launchDate: isoDate(launchDate),
    launchLabel: monthLabel(isoDate(launchDate)),
    dossierSubmission,
    regulatoryApproval,
    reimbursementApproval,
    milestones,
    launchManager: pick(rnd, OWNERS),
    activities,
  };
}

// ----------------------------------------------------------------------------
// Exported data
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Pinned demo story: Breztri — Italy
// "Italy is 72% ready. Regulatory approval is the next milestone.
//  Three critical Medical activities are delayed."
// ----------------------------------------------------------------------------

function pinBreztriItaly(launch: Launch): Launch {
  launch.status = 'at-risk';
  launch.completion = 72;
  launch.launchManager = 'Sonika Agarwal';

  // Sweep generated noise so the story is exactly: 3 delayed Medical tasks,
  // 1 blocked Global handoff. Everything else reads healthy.
  const currentIdx = PHASES.indexOf(launch.currentPhase);
  for (const a of launch.activities) {
    if (a.function === 'Medical' && a.phase === launch.currentPhase) continue;
    const isPast = PHASES.indexOf(a.phase) < currentIdx;
    for (const t of a.tasks) {
      if (t.status === 'delayed' || t.status === 'at-risk') {
        t.status = isPast ? 'completed' : 'on-track';
        t.completion = isPast ? 100 : Math.max(t.completion, 60);
        t.followUpDate = undefined; t.followUpWith = undefined; t.comments = undefined;
      }
      if (t.handoffStatus === 'blocked') t.handoffStatus = 'accepted';
      if (!t.leadOwner) t.leadOwner = 'Maria Keller';
    }
    if (a.tasks.length > 0) {
      const rolled = rollUp(a.tasks);
      a.status = rolled.status;
      a.completion = rolled.completion;
    }
  }

  launch.milestones = [
    { key: 'dossier', label: 'Dossier Submission', date: '2026-01-15', status: 'completed' },
    { key: 'regulatory', label: 'Regulatory Approval', date: '2026-09-20', status: 'at-risk' },
    { key: 'reimbursement', label: 'Reimbursement Approval', date: '2027-01-10', status: 'upcoming' },
    { key: 'launch', label: 'Launch', date: launch.launchDate, status: 'upcoming' },
  ];
  launch.dossierSubmission = '2026-01-15';
  launch.regulatoryApproval = '2026-09-20';
  launch.reimbursementApproval = '2027-01-10';

  // Exactly 3 delayed critical Medical tasks in the current phase, one of
  // them a blocked Global handoff with no local owner — the demo money shot.
  const medical = launch.activities.find(
    a => a.function === 'Medical' && a.phase === launch.currentPhase,
  )!;
  medical.hasActivities = true;
  medical.status = 'delayed';
  medical.completion = 55;
  medical.tasks = [
    {
      id: `${launch.id}_pin_med_0`,
      name: 'Adapt global launch strategy for the Italian market',
      focusArea: 'Enabling Medical Success', workArea: 'Develop Global Strategy',
      status: 'delayed', completion: 20,
      taskType: 'core', origin: 'global', handoffStatus: 'blocked',
      leadOwner: null, leadFunction: 'Medical', otherFunctions: ['Insights & Analytics'],
      startDate: '2026-04-01', endDate: '2026-07-01',
      ownership: 'Collaboration', hasDocument: true, hasSubtasks: true, subtasks: [], linkedToLRI: true,
      followUpDate: '2026-07-20', followUpWith: 'Emma Clarke',
      comments: 'Received from Global on 01-Apr-2026. No Italian owner assigned yet — handoff blocked.',
    },
    {
      id: `${launch.id}_pin_med_1`,
      name: 'Complete AIFA pre-submission medical briefing pack',
      focusArea: 'Enabling Medical Success', workArea: 'Enable Scientific Exchange',
      status: 'delayed', completion: 45,
      taskType: 'core', origin: 'local',
      leadOwner: 'Elena Rossi', leadFunction: 'Medical', otherFunctions: [],
      startDate: '2026-03-15', endDate: '2026-06-30',
      ownership: 'MC', hasDocument: true, hasSubtasks: true, subtasks: [], linkedToLRI: true,
      followUpDate: '2026-07-21', followUpWith: 'Marco Bianchi',
      comments: 'Waiting on final safety data tables from Global biostatistics.',
    },
    {
      id: `${launch.id}_pin_med_2`,
      name: 'Finalise Italian KOL advisory board outcomes report',
      focusArea: 'Enabling Medical Success', workArea: 'Ensure Engagement & Insights',
      status: 'delayed', completion: 60,
      taskType: 'market-specific', origin: 'local',
      leadOwner: 'Elena Rossi', leadFunction: 'Medical', otherFunctions: [],
      startDate: '2026-05-01', endDate: '2026-07-05',
      ownership: 'MC', hasDocument: false, hasSubtasks: true, subtasks: [], linkedToLRI: false,
      followUpDate: '2026-07-18', followUpWith: 'Giulia Romano',
      comments: 'Escalated at cross-functional launch team meeting.',
    },
    {
      id: `${launch.id}_pin_med_3`,
      name: 'Deliver medical education curriculum to field team',
      focusArea: 'Enabling Medical Success', workArea: 'Enable Scientific Exchange',
      status: 'on-track', completion: 70,
      taskType: 'recommended', origin: 'global', handoffStatus: 'accepted',
      leadOwner: 'Marco Bianchi', leadFunction: 'Medical', otherFunctions: [],
      startDate: '2026-05-10', endDate: '2026-09-15',
      ownership: 'MC', hasDocument: true, hasSubtasks: true, subtasks: [], linkedToLRI: false,
    },
    {
      id: `${launch.id}_pin_med_4`,
      name: 'Map patient journey with local clinical experts',
      focusArea: 'Enabling Medical Success', workArea: 'Generate Evidence',
      status: 'on-track', completion: 80,
      taskType: 'core', origin: 'local',
      leadOwner: 'Akiko Tanaka', leadFunction: 'Medical', otherFunctions: ['Insights & Analytics'],
      startDate: '2026-04-20', endDate: '2026-08-30',
      ownership: 'MC', hasDocument: false, hasSubtasks: true, subtasks: [], linkedToLRI: true,
    },
  ];
  return launch;
}

export const LAUNCHES: Launch[] = PRODUCTS.flatMap(p =>
  (PRODUCT_MARKETS[p.id] ?? []).map(c => {
    if (p.id === 'p6' && c === 'Italy') {
      // Launch ~8 months out → currently in L-12 to L-6
      return pinBreztriItaly(generateLaunch(p, c, { launchDate: new Date('2027-03-01'), health: 0.5 }));
    }
    return generateLaunch(p, c);
  })
);

// Recompute every launch's readiness + status from its tasks (weighted model).
LAUNCHES.forEach(normalizeLaunch);

export interface NewLaunchInput {
  productId: string;
  country: string;
  status?: Status;
  phase?: Phase;
  launchDate: string; // ISO
}

/** Create a launch from the shared task template. Structure + product lead are
 *  inherited from an existing launch of the same brand (preferred) or same
 *  country. Appended to LAUNCHES and returned. */
export function createLaunch(input: NewLaunchInput): Launch {
  const product = getProduct(input.productId);
  const reference =
    LAUNCHES.find(l => l.productId === input.productId) ??
    LAUNCHES.find(l => l.country === input.country);

  const launch = generateLaunch(product, input.country, {
    launchDate: new Date(input.launchDate),
  });
  if (reference) launch.launchManager = reference.launchManager;
  if (input.phase) launch.currentPhase = input.phase;

  // Guarantee a unique id even if this brand×country already exists.
  let uid = launch.id, n = 2;
  while (LAUNCHES.some(l => l.id === uid)) uid = `${launch.id}_${n++}`;
  launch.id = uid;

  normalizeLaunch(launch);
  if (input.status) launch.status = input.status; // honour an explicit manual status

  LAUNCHES.push(launch);
  return launch;
}

// ----------------------------------------------------------------------------
// Signed-in user (personal "My Tasks" view). Assign a spread of tasks — varied
// status, brand and function — so the personal view has a realistic dataset.
// ----------------------------------------------------------------------------

export const CURRENT_USER = 'Rakshit Rajgopal';

function pinCurrentUserTasks(): void {
  // How many of each status we want Rakshit to own (a believable personal mix).
  const wanted: Partial<Record<Status, number>> = {
    'delayed': 3, 'at-risk': 3, 'on-track': 5, 'completed': 3, 'not-started': 1,
  };
  const taken: Record<string, number> = {};

  // Round-robin across launches (skipping the pinned Italy story) so Rakshit's
  // tasks span multiple brands rather than clustering in one launch.
  const queues = LAUNCHES
    .filter(l => l.country !== 'Italy')
    .map(l => l.activities.flatMap(a => a.tasks));

  const done = () => Object.entries(wanted).every(([s, n]) => (taken[s] ?? 0) >= (n ?? 0));

  let idx = 0, progress = true;
  while (progress && !done()) {
    progress = false;
    for (const q of queues) {
      if (idx >= q.length) continue;
      progress = true;
      const t = q[idx];
      const need = wanted[t.status] ?? 0;
      if (t.leadOwner && t.leadOwner !== CURRENT_USER && (taken[t.status] ?? 0) < need) {
        t.leadOwner = CURRENT_USER;
        taken[t.status] = (taken[t.status] ?? 0) + 1;
      }
    }
    idx++;
  }
}
pinCurrentUserTasks();

export interface MyTask {
  task: Task;
  launch: Launch;
  product: Product;
  phase: Phase;
}

/** All tasks owned by a given person, across every launch. */
export function tasksForOwner(owner: string): MyTask[] {
  const out: MyTask[] = [];
  for (const launch of LAUNCHES) {
    const product = getProduct(launch.productId);
    for (const a of launch.activities) {
      for (const task of a.tasks) {
        if (task.leadOwner === owner) out.push({ task, launch, product, phase: a.phase });
      }
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Derived helpers for the redesigned views
// ----------------------------------------------------------------------------

export function nextMilestone(launch: Launch): Milestone | undefined {
  return launch.milestones.find(m => m.status !== 'completed');
}

/** Tasks that need attention: delayed, or blocked global handoffs, in the current phase first. */
export function attentionTasks(launch: Launch): Task[] {
  const all = launch.activities.flatMap(a => a.tasks);
  const flagged = all.filter(t => t.status === 'delayed' || t.handoffStatus === 'blocked');
  const phaseIdx = (p: Phase) => PHASES.indexOf(p);
  const currentIdx = phaseIdx(launch.currentPhase);
  return flagged.sort((a, b) => {
    const aCur = launch.activities.find(x => x.tasks.includes(a))!.phase;
    const bCur = launch.activities.find(x => x.tasks.includes(b))!.phase;
    return Math.abs(phaseIdx(aCur) - currentIdx) - Math.abs(phaseIdx(bCur) - currentIdx);
  });
}

export interface FunctionReadiness {
  fn: BusinessFunction;
  completion: number;
  delayed: number;
  dueSoon: number;   // ends within 60 days, not completed
  total: number;
}

export function functionReadiness(launch: Launch): FunctionReadiness[] {
  return FUNCTIONS.map(fn => {
    const acts = launch.activities.filter(a => a.function === fn && a.tasks.length > 0);
    const tasks = acts.flatMap(a => a.tasks);
    const soonCutoff = addMonths(TODAY, 2);
    return {
      fn,
      completion: acts.length
        ? Math.round(acts.reduce((s, a) => s + a.completion, 0) / acts.length)
        : 0,
      delayed: tasks.filter(t => t.status === 'delayed').length,
      dueSoon: tasks.filter(t =>
        t.status !== 'completed' && t.status !== 'not-started' &&
        new Date(t.endDate) >= TODAY && new Date(t.endDate) <= soonCutoff).length,
      total: tasks.length,
    };
  });
}

// ----------------------------------------------------------------------------
// Activity Overview (playbook view): Focus Area columns × Work Area cards
// ----------------------------------------------------------------------------

export interface WorkAreaCell {
  workArea: string;
  status: Status;
  completion: number;
  taskCount: number;
  leadFunction: BusinessFunction;
}

export interface FocusAreaColumn {
  focusArea: FocusArea;
  num: number;
  cells: WorkAreaCell[];
  taskCount: number;
}

/**
 * Card status for the playbook grid. More intuitive than the generic rollUp:
 * any delay/risk wins, otherwise the card reflects whether work is done,
 * in-flight, or not yet begun — so a part-complete card never reads "Not Started".
 */
function cellStatus(tasks: Task[]): Status {
  if (tasks.length === 0) return 'not-applicable';
  if (tasks.some(t => t.status === 'delayed')) return 'delayed';
  if (tasks.some(t => t.status === 'at-risk')) return 'at-risk';
  if (tasks.every(t => t.status === 'completed')) return 'completed';
  if (tasks.every(t => t.status === 'not-started')) return 'not-started';
  return 'on-track';
}

/**
 * Roll the launch's tasks up into the playbook grid: one column per Focus Area,
 * one card per Work Area that has activity in the selected phase window.
 */
export function activityOverview(launch: Launch, phase: Phase | 'ALL'): FocusAreaColumn[] {
  const tasks = launch.activities
    .filter(a => phase === 'ALL' || a.phase === phase)
    .flatMap(a => a.tasks);

  return FOCUS_AREAS.map(fa => {
    const faTasks = tasks.filter(t => t.focusArea === fa);
    // Preserve the canonical work-area order from the playbook.
    const cells: WorkAreaCell[] = WORK_AREAS[fa]
      .map(wa => {
        const waTasks = faTasks.filter(t => t.workArea === wa);
        if (waTasks.length === 0) return null;
        const completion = Math.round(waTasks.reduce((s, t) => s + t.completion, 0) / waTasks.length);
        const leadFunction = waTasks[0].leadFunction;
        return { workArea: wa, status: cellStatus(waTasks), completion, taskCount: waTasks.length, leadFunction };
      })
      .filter((c): c is WorkAreaCell => c !== null);
    return { focusArea: fa, num: FOCUS_AREA_NUM[fa], cells, taskCount: faTasks.length };
  });
}

/** Global→Market handoff summary for a launch. */
export function handoffs(launch: Launch): { task: Task; phase: Phase }[] {
  return launch.activities.flatMap(a =>
    a.tasks.filter(t => t.origin === 'global').map(task => ({ task, phase: a.phase })));
}

/** Rule-generated "AI" insight for the concept card. */
export function launchInsight(launch: Launch, product: Product): string {
  const next = nextMilestone(launch);
  const attention = attentionTasks(launch);
  if (!next) return `${product.brand} ${launch.country} has completed all governance milestones.`;
  const fnCounts = new Map<string, number>();
  attention.forEach(t => fnCounts.set(t.leadFunction, (fnCounts.get(t.leadFunction) ?? 0) + 1));
  const topFn = [...fnCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const dateStr = new Date(next.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  if (!topFn) {
    return `${next.label} is scheduled for ${dateStr}. No critical activities are currently flagged — readiness is trending on target.`;
  }
  const blocked = attention.filter(t => t.handoffStatus === 'blocked').length;
  let msg = `${next.label} is approaching on ${dateStr}, but ${topFn[1]} required ${topFn[0]} ${topFn[1] === 1 ? 'activity remains' : 'activities remain'} incomplete.`;
  if (blocked > 0) msg += ` ${blocked} Global-to-Market ${blocked === 1 ? 'handoff is' : 'handoffs are'} blocked awaiting a local owner.`;
  return msg;
}

export function getProduct(productId: string): Product {
  return PRODUCTS.find(p => p.id === productId)!;
}

export function getLaunch(launchId: string): Launch | undefined {
  return LAUNCHES.find(l => l.id === launchId);
}

export function findLaunch(productId: string, country: string): Launch | undefined {
  return LAUNCHES.find(l => l.productId === productId && l.country === country);
}
