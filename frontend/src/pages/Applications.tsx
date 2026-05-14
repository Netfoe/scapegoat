import { useQuery } from '@tanstack/react-query';
import { Package, Plus, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useOrganisation } from '../context/OrganisationContext';
import { useTitle } from '../hooks/useTitle';

export default function Applications() {
  useTitle('Applications');
  const { selectedOrganisation } = useOrganisation();
  const selectedOrgId = selectedOrganisation?.id;

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['products', selectedOrgId],
    queryFn: () => api.fetchProducts(selectedOrgId!),
    enabled: !!selectedOrgId
  });

  if (!selectedOrgId) {
    return (
      <div className="card empty-state">
        <h3 className="card-title">No Organisation Selected</h3>
        <p className="text-muted mt-4">Please select an organisation from the switcher above to manage applications.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <span className="text-muted">Loading applications...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="page-title">Applications</h2>
          <p className="page-subtitle">Manage software applications for {selectedOrganisation.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/applications/import-github" className="btn btn-outline">
            <Code2 size={18} />
            Import from GitHub
          </Link>
          <Link to="/applications/new" className="btn btn-primary">
            <Plus size={18} />
            Add Application
          </Link>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="card empty-state">
          <Package size={48} className="empty-icon" />
          <h3 className="text-xl font-bold">No Applications yet</h3>
          <p className="text-muted mt-2">
            Create your first application to start tracking repositories and dependencies.
          </p>
          <Link to="/applications/new" className="btn btn-primary mt-6">
            Add Application
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map(app => (
            <Link key={app.id} to={`/applications/${app.id}`} className="card hover-shadow transition-all">
              <div className="card-header pb-2">
                <h3 className="card-title text-lg">{app.name}</h3>
              </div>
              <div className="card-content pt-0">
                <div className="flex justify-between items-center text-sm text-muted">
                  <span>Created {new Date(app.created_at).toLocaleDateString()}</span>
                  <span className="badge badge-default">View Details</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
