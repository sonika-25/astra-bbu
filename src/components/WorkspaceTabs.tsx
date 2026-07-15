import type { Route } from '../App';

type WorkspaceView = 'activity' | 'functional' | 'tasks';

interface Props {
  launchId: string;
  current: WorkspaceView;
  navigate: (r: Route) => void;
}

// Only the first three are wired; the rest are shown for fidelity to the
// real LaunchPAL workspace but disabled in the prototype.
const TABS: { label: string; view?: WorkspaceView }[] = [
  { label: 'Cross Functional Launch Team' },
  { label: 'Activity Overview', view: 'activity' },
  { label: 'Functional Overview', view: 'functional' },
  { label: 'Task View', view: 'tasks' },
  { label: 'Heat Map' },
  { label: 'Gantt Chart' },
  { label: 'Calendar' },
  { label: 'Deliverables Checklist' },
  { label: 'OPS Plan' },
];

export function WorkspaceTabs({ launchId, current, navigate }: Props) {
  return (
    <div className="workspace-tabs">
      {TABS.map(t => (
        <button
          key={t.label}
          className={t.view === current ? 'tab-active' : ''}
          disabled={!t.view}
          onClick={() => t.view && navigate({ view: t.view, launchId })}
        >
          ☰ {t.label}
        </button>
      ))}
    </div>
  );
}
