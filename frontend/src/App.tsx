import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { User } from 'oidc-client-ts';
import { OrganisationProvider } from './context/OrganisationContext';
import { zitadel } from './auth';
import Layout from './components/Layout';
import Applications from './pages/Applications';
import AddApplication from './pages/AddApplication';
import ApplicationDetails from './pages/ApplicationDetails';
import AddRepository from './pages/AddRepository';
import ProductSbom from './pages/ProjectSbom';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import PolicyDetail from './pages/PolicyDetail';
import Licenses from './pages/Licenses';
import LicenseDetail from './pages/LicenseDetail';
import DependencySearch from './pages/DependencySearch';
import ImportGitHub from './pages/ImportGitHub';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Callback from './pages/Callback';

const queryClient = new QueryClient();

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const handleUser = (user: User | null) => {
      setAuthenticated(!!user && !user.expired);
    };

    // Initial check
    zitadel.userManager.getUser().then(handleUser);

    // Subscribe to events
    const onUserLoaded = (user: User) => handleUser(user);
    const onUserUnloaded = () => handleUser(null);
    const onTokenExpired = () => handleUser(null);

    zitadel.userManager.events.addUserLoaded(onUserLoaded);
    zitadel.userManager.events.addUserUnloaded(onUserUnloaded);
    zitadel.userManager.events.addAccessTokenExpired(onTokenExpired);

    return () => {
      zitadel.userManager.events.removeUserLoaded(onUserLoaded);
      zitadel.userManager.events.removeUserUnloaded(onUserUnloaded);
      zitadel.userManager.events.removeAccessTokenExpired(onTokenExpired);
    };
  }, []);

  if (authenticated === null) {
    return (
      <div className="app-container center-page">
        <div className="loader-container p-0"><div className="spinner"></div><span className="text-muted mt-2">Loading...</span></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <OrganisationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={authenticated ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/callback" element={<Callback />} />
            
            <Route 
              path="/" 
              element={authenticated ? <Layout /> : <Navigate to="/login" replace />}
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="applications" element={<Applications />} />
              <Route path="applications/new" element={<AddApplication />} />
              <Route path="applications/import-github" element={<ImportGitHub />} />
              <Route path="applications/:id" element={<ApplicationDetails />} />
              <Route path="applications/:id/repositories/new" element={<AddRepository />} />
              <Route path="repositories/:id" element={<ProductSbom />} />
              <Route path="policies" element={<Policies />} />
              <Route path="policies/:id" element={<PolicyDetail />} />
              <Route path="licenses" element={<Licenses />} />
              <Route path="licenses/:name" element={<LicenseDetail />} />
              <Route path="search" element={<DependencySearch />} />
              <Route path="settings" element={<Settings />} />
              {/* Legacy redirect */}
              <Route path="repositories" element={<Navigate to="/applications" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </OrganisationProvider>
    </QueryClientProvider>
  );
}

export default App;
