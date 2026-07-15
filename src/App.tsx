import { useState } from 'react';
import type { Phase, BusinessFunction, FocusArea } from './data/mockData';
import { AppHeader } from './components/AppHeader';
import { OverviewDashboard } from './components/OverviewDashboard';
import { LaunchSummary } from './components/LaunchSummary';
import { ActivityOverview } from './components/ActivityOverview';
import { FunctionalOverview } from './components/FunctionalOverview';
import { TaskView } from './components/TaskView';
import { LaunchPipeline } from './components/LaunchPipeline';
import { MyTasks } from './components/MyTasks';
import { Home } from './components/Home';
import { AIAssistant } from './components/AIAssistant';
import './App.css';

export type Route =
  | { view: 'home' }
  | { view: 'dashboard'; filter?: 'at-risk' }
  | { view: 'summary'; launchId: string }
  | { view: 'activity'; launchId: string; phase?: Phase }
  | { view: 'functional'; launchId: string }
  | { view: 'tasks'; launchId: string; phase?: Phase; fn?: BusinessFunction; focusArea?: FocusArea }
  | { view: 'pipeline'; mode?: 'calendar'; year?: number }
  | { view: 'mytasks'; filter?: 'high-risk' };

export default function App() {
  const [route, setRoute] = useState<Route>({ view: 'home' });
  const activeLaunchId = 'launchId' in route ? route.launchId : undefined;

  return (
    <div className="app">
      <AppHeader route={route} navigate={setRoute} />
      {route.view === 'home' && <Home navigate={setRoute} />}
      {route.view === 'dashboard' && <OverviewDashboard initialStatusFilter={route.filter === 'at-risk' ? 'At risk' : undefined} navigate={setRoute} />}
      {route.view === 'summary' && (
        <LaunchSummary launchId={route.launchId} navigate={setRoute} />
      )}
      {route.view === 'activity' && (
        <ActivityOverview launchId={route.launchId} initialPhase={route.phase} navigate={setRoute} />
      )}
      {route.view === 'functional' && (
        <FunctionalOverview launchId={route.launchId} navigate={setRoute} />
      )}
      {route.view === 'tasks' && (
        <TaskView
          launchId={route.launchId}
          initialPhase={route.phase}
          initialFn={route.fn}
          initialFocusArea={route.focusArea}
          navigate={setRoute}
        />
      )}
      {route.view === 'pipeline' && <LaunchPipeline initialViewMode={route.mode} initialCalendarYear={route.year} navigate={setRoute} />}
      {route.view === 'mytasks' && <MyTasks initialRiskFilter={route.filter} navigate={setRoute} />}
      {route.view !== 'home' && <AIAssistant activeLaunchId={activeLaunchId} />}
    </div>
  );
}
