import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useOrganisation } from '../context/OrganisationContext';
import { useTitle } from '../hooks/useTitle';
import { GitBranch, Plus, ChevronLeft, Shield } from 'lucide-react';

export default function ApplicationDetails() {
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);
  const { selectedOrganisation } = useOrganisation();
  const selectedOrgId = selectedOrganisation?.id;

  const { data: applications = [] } = useQuery({ 
    queryKey: ['products', selectedOrgId], 
    queryFn: () => api.fetchProducts(selectedOrgId!),
    enabled: !!selectedOrgId 
  });

  const application = applications.find(a => a.id === appId);
  useTitle(application?.name || 'Application Details');

  const { data: repositories = [], isLoading } = useQuery({ 
    queryKey: ['repositories', appId, selectedOrgId], 
    queryFn: () => api.fetchRepositories(appId, selectedOrgId),
    enabled: !!appId,
    refetchInterval: 5000
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies', selectedOrgId],
    queryFn: () => api.fetchPolicies(selectedOrgId),
    enabled: !!selectedOrgId
  });

  const currentPolicy = policies.find(p => p.id === application?.policy_id);

  if (isLoading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <span className="text-muted">Loading repositories...</span>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="card empty-state">
        <h3 className="card-title">Application not found</h3>
        <Link to="/applications" className="btn btn-primary mt-4">Back to Applications</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full fade-in">
      <div className="flex items-center gap-2 text-muted mb-2">
        <Link to="/applications" className="hover:text-primary flex items-center gap-1">
          <ChevronLeft size={16} />
          Back to Applications
        </Link>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h2 className="page-title">{application.name}</h2>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-muted">Application ID: {application.id}</span>
            {currentPolicy && (
              <div className="flex items-center gap-1 text-success bg-success-bg px-2 py-0.5 rounded text-sm font-medium border border-success">
                <Shield size={14} />
                Policy: {currentPolicy.name}
              </div>
            )}
          </div>
        </div>
        <Link to={`/applications/${appId}/repositories/new`} className="btn btn-primary">
          <Plus size={18} />
          Add Repository
        </Link>
      </div>

      <div className="card mt-4">
        <div className="card-header border-b border-border pb-4">
          <h3 className="card-title">Repositories</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Repository</th>
                <th>Status</th>
                <th>Last Scan</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {repositories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-10">
                    No repositories found for this application.
                  </td>
                </tr>
              ) : (
                repositories.map(repo => (
                  <tr key={repo.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="bg-muted p-2 rounded">
                          <GitBranch size={16} className="text-muted" />
                        </div>
                        <div>
                          <div className="font-bold">{repo.name}</div>
                          <div className="text-xs text-muted font-mono">{repo.repo_url}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        repo.status === 'completed' ? 'badge-success' : 
                        repo.status === 'error' ? 'badge-danger' : 
                        'badge-default'
                      }`}>
                        {repo.status}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {repo.last_scan ? new Date(repo.last_scan).toLocaleString() : 'Never'}
                    </td>
                    <td className="text-right">
                      <Link to={`/repositories/${repo.id}`} className="btn btn-outline btn-sm">
                        View SBOM
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
