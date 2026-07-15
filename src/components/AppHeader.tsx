import type { Route } from '../App';
import { getLaunch, getProduct, CURRENT_USER } from '../data/mockData';

interface Props {
  route: Route;
  navigate: (r: Route) => void;
}

export function AppHeader({ route, navigate }: Props) {
  const hasLaunch = route.view === 'summary' || route.view === 'activity'
    || route.view === 'functional' || route.view === 'tasks';
  const launch = hasLaunch ? getLaunch(route.launchId) : undefined;
  const product = launch ? getProduct(launch.productId) : undefined;

  return (
    <header className="app-header">
      <div className="header-main">
        <button className="logo" onClick={() => navigate({ view: 'home' })} aria-label="LaunchPAL home">
          <svg className="logo-mark" viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
            <g fill="none" strokeWidth="3" strokeLinecap="round">
              {Array.from({ length: 6 }).map((_, i) => (
                <ellipse
                  key={i}
                  cx="24" cy="24" rx="9" ry="20"
                  transform={`rotate(${i * 30} 24 24)`}
                  stroke={i % 2 === 0 ? '#d0006f' : '#f0ab00'}
                  opacity="0.9"
                />
              ))}
            </g>
          </svg>
          <span className="logo-text">
            <strong>Launch<em>PAL</em></strong>
            <small>Plan · Act · Lead</small>
          </span>
        </button>
        <nav className="header-nav">
          <button
            className={route.view === 'home' ? 'nav-active' : ''}
            onClick={() => navigate({ view: 'home' })}
          >
            Home
          </button>
          <button
            className={route.view === 'dashboard' ? 'nav-active' : ''}
            onClick={() => navigate({ view: 'dashboard' })}
          >
            Overview Dashboard
          </button>
          <button
            className={route.view === 'mytasks' ? 'nav-active' : ''}
            onClick={() => navigate({ view: 'mytasks' })}
          >
            My Tasks
          </button>
          <button
            className={route.view === 'pipeline' ? 'nav-active' : ''}
            onClick={() => navigate({ view: 'pipeline' })}
          >
            Launch Pipeline
          </button>
          <button disabled title="Coming soon">Reports</button>
        </nav>
        <div className="header-actions">
          <button className="btn-ghost" onClick={()=>alert("Sending report to Customer service")}>Ask For Help</button>
          <button className="header-user" onClick={() => navigate({ view: 'mytasks' })} title="View my tasks">
            <span className="header-user-avatar">{CURRENT_USER.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
            <span className="header-user-name">
              <strong>{CURRENT_USER}</strong>
              <small>Launch Manager</small>
            </span>
          </button>
        </div>
      </div>
      {route.view === 'pipeline' && (
        <div className="breadcrumbs">
          <button onClick={() => navigate({ view: 'dashboard' })}>Overview Dashboard</button>
          <span>›</span>
          <span className="crumb-current">Launch Pipeline</span>
        </div>
      )}
      {route.view === 'mytasks' && (
        <div className="breadcrumbs">
          <button onClick={() => navigate({ view: 'dashboard' })}>Overview Dashboard</button>
          <span>›</span>
          <span className="crumb-current">My Tasks</span>
        </div>
      )}
      {route.view !== 'dashboard' && route.view !== 'pipeline' && route.view !== 'mytasks' && launch && product && (
        <div className="breadcrumbs">
          <button onClick={() => navigate({ view: 'dashboard' })}>Overview Dashboard</button>
          <span>›</span>
          {route.view === 'summary' ? (
            <span className="crumb-current">{product.brand} — {launch.country}</span>
          ) : (
            <button onClick={() => navigate({ view: 'summary', launchId: launch.id })}>
              {product.brand} — {launch.country}
            </button>
          )}
          {route.view === 'activity' && (
            <>
              <span>›</span>
              <span className="crumb-current">Activity Overview</span>
            </>
          )}
          {route.view === 'functional' && (
            <>
              <span>›</span>
              <span className="crumb-current">Functional Overview</span>
            </>
          )}
          {route.view === 'tasks' && (
            <>
              <span>›</span>
              <button onClick={() => navigate({ view: 'activity', launchId: launch.id })}>Activity Overview</button>
              <span>›</span>
              <span className="crumb-current">Task View</span>
            </>
          )}
        </div>
      )}
    </header>
  );
}
