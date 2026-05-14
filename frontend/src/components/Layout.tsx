import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { OrganisationSwitcher } from './OrganisationSwitcher';
import { zitadel } from '../auth';
import { User } from 'oidc-client-ts';
import { Moon, Sun, LogOut } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    return 'light';
  });

  useEffect(() => {
    zitadel.userManager.getUser().then((user) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSignout = () => {
    zitadel.signout();
  };

  const isSettingsPage = location.pathname.startsWith('/settings');

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <header className="app-header">
          <div className="app-header-left">
            <div className="brand">
              <h1 className="brand-title">Scapegoat</h1>
              <p className="brand-subtitle">Software Supply Chain Visibility</p>
            </div>
            {!isSettingsPage && <OrganisationSwitcher />}
          </div>
          
          <div className="app-header-right">
            <nav className="main-nav">
              <Link 
                to="/dashboard"
                className={`nav-link ${location.pathname.startsWith('/dashboard') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
              <Link 
                to="/applications"
                className={`nav-link ${location.pathname.startsWith('/applications') ? 'active' : ''}`}
              >
                Applications
              </Link>
              <Link 
                to="/licenses"
                className={`nav-link ${location.pathname.startsWith('/licenses') ? 'active' : ''}`}
              >
                Licenses
              </Link>
              <Link 
                to="/policies"
                className={`nav-link ${location.pathname.startsWith('/policies') ? 'active' : ''}`}
              >
                Policies
              </Link>
              <Link 
                to="/search"
                className={`nav-link ${location.pathname.startsWith('/search') ? 'active' : ''}`}
              >
                Search
              </Link>
              <Link 
                to="/settings"
                className={`nav-link ${location.pathname.startsWith('/settings') ? 'active' : ''}`}
              >
                Settings
              </Link>
            </nav>

            <div className="header-actions">
              {user && (
                <div className="flex flex-col items-end mr-2">
                  <span className="text-sm font-semibold">{user.profile.preferred_username || user.profile.name}</span>
                  <button 
                    onClick={handleSignout}
                    className="btn btn-ghost btn-sm text-danger"
                  >
                    <LogOut size={12} />
                    Sign out
                  </button>
                </div>
              )}

              <button onClick={toggleTheme} className="btn btn-ghost btn-icon" aria-label="Toggle theme">
                {theme === 'light' ? (
                  <Moon size={20} />
                ) : (
                  <Sun size={20} />
                )}
              </button>
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
