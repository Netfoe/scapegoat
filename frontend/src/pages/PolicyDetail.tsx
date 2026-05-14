import { type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ArrowLeft, ShieldCheck, Package, ShieldAlert, Layers } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

const PolicyDetail: FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: details, isLoading, isError } = useQuery({
    queryKey: ['policyDetails', id],
    queryFn: () => api.fetchPolicyDetails(id!),
    enabled: !!id,
  });

  useTitle(details?.policy?.name ? `Policy: ${details.policy.name}` : 'Policy Detail');

  if (isLoading) return <div className="loader-container"><div className="spinner"></div><span className="text-muted">Loading policy details...</span></div>;
  if (isError || !details) return <div className="empty-state text-danger">Error loading policy details.</div>;

  const { policy, products: applications = [], breaches = [], compliance_percent, total_components, denied_components } = details;

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/policies" className="btn btn-outline btn-icon">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="page-title mb-0">{policy.name}</h2>
      </div>

      <div className="grid grid-cols-4">
        <div className={`card stat-card ${compliance_percent < 100 ? 'border-danger' : 'border-success'}`}>
          <div className="stat-card-header">
            <div className="flex flex-col">
              <span className="stat-label">Compliance</span>
              <span className={`stat-value ${compliance_percent < 100 ? 'text-danger' : 'text-success'}`}>
                {compliance_percent.toFixed(1)}%
              </span>
            </div>
            {compliance_percent < 100 ? <ShieldAlert size={20} className="text-danger" /> : <ShieldCheck size={20} className="text-success" />}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-header">
            <div className="flex flex-col">
              <span className="stat-label">Total Components</span>
              <span className="stat-value">{total_components}</span>
            </div>
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className={`card stat-card ${denied_components > 0 ? 'border-danger' : 'border-success'}`}>
          <div className="stat-card-header">
            <div className="flex flex-col">
              <span className="stat-label">Breaches</span>
              <span className={`stat-value ${denied_components > 0 ? 'text-danger' : ''}`}>{denied_components}</span>
            </div>
            {denied_components > 0 ? <ShieldAlert size={20} className="text-danger" /> : <ShieldCheck size={20} className="text-success" />}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-header">
            <div className="flex flex-col">
              <span className="stat-label">Active Applications</span>
              <span className="stat-value">{applications?.length || 0}</span>
            </div>
            <Layers size={20} className="text-muted" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b border-border pb-4 mb-4">
          <h3 className="card-title">Policy Configuration</h3>
        </div>
        <div className="card-content pt-0">
          <div className="grid grid-cols-3">
            <div className="flex flex-col gap-2">
              <span className="font-bold text-sm text-success">Allowed Licenses</span>
              <div className="p-4 bg-surface-hover rounded-md text-sm text-muted font-mono">{policy.allowed_licenses || 'Any'}</div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-sm text-danger">Disallowed Licenses</span>
              <div className="p-4 bg-surface-hover rounded-md text-sm text-muted font-mono">{policy.disallowed_licenses || 'None'}</div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-sm text-warning">Disallowed Dependencies</span>
              <div className="p-4 bg-surface-hover rounded-md text-sm text-muted font-mono">{policy.disallowed_deps || 'None'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-danger-bg text-danger border-b border-danger">
          <h3 className="card-title mb-0">Compliance Breaches</h3>
        </div>
        {!breaches || breaches.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted font-semibold">No breaches found. All applications are compliant!</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Application / Repo</th>
                  <th>Component</th>
                  <th>License</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {breaches.map((breach, index) => (
                  <tr key={index}>
                    <td>
                      <div className="font-bold">{breach.product_name}</div>
                      <div className="text-sm text-muted">{breach.repository_name}</div>
                    </td>
                    <td className="font-bold">{breach.component_name}</td>
                    <td>
                      <Link to={`/licenses/${encodeURIComponent(breach.license)}`} className="no-underline">
                        <span className="badge badge-info cursor-pointer hover:bg-info transition-colors">
                          {breach.license}
                        </span>
                      </Link>
                    </td>
                    <td className="font-bold text-danger">{breach.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyDetail;
