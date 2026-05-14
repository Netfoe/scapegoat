import { type FC, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useOrganisation } from '../context/OrganisationContext';
import { ArrowLeft, ExternalLink, ShieldCheck, ShieldAlert, Package, Building2, Layers, GitBranch } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';
import spdxLicenseList from 'spdx-license-list';
import { getRepositoryUrl } from '../lib/purl';

const LicenseDetail: FC = () => {
  const { name } = useParams<{ name: string }>();
  const licenseName = name ? decodeURIComponent(name) : '';
  useTitle(licenseName ? `License: ${licenseName}` : 'License Detail');
  const { selectedOrganisation } = useOrganisation();
  const selectedOrg = selectedOrganisation?.id;

  const { data: usage, isLoading, isError } = useQuery({
    queryKey: ['licenseUsage', licenseName, selectedOrg],
    queryFn: () => api.fetchLicenseDetails(licenseName, selectedOrg),
    enabled: !!licenseName,
  });

  const licenseInfo = useMemo(() => {
    // Try to find the license in the SPDX list
    // Some keys might be different case, though SPDX IDs are usually uppercase
    return spdxLicenseList[licenseName] || 
           Object.values(spdxLicenseList).find(l => l.name === licenseName) ||
           null;
  }, [licenseName]);

  const stats = useMemo(() => {
    if (!usage) return null;
    return {
      totalComponents: usage.length,
      numOrganisations: new Set(usage.map(u => u.organisation_name)).size,
      numApplications: new Set(usage.map(u => u.product_name)).size,
      numRepositories: new Set(usage.map(u => u.repository_name)).size,
    };
  }, [usage]);

  if (isLoading) return <div className="loader-container"><div className="spinner"></div><span className="text-muted">Loading license usage...</span></div>;
  if (isError) return <div className="empty-state text-danger">Error loading license usage.</div>;

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/licenses" className="btn btn-outline btn-icon">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="page-title mb-2">{licenseName}</h2>
          {licenseInfo && <p className="text-muted">{licenseInfo.name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2">
        {/* License Info Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">License Information</h3>
          </div>
          <div className="card-content flex flex-col gap-4">
            {licenseInfo ? (
              <>
                <div className="flex items-center gap-2">
                  {licenseInfo.osiApproved ? (
                    <div className="flex items-center gap-2 text-success">
                      <ShieldCheck size={20} />
                      <span className="font-semibold">OSI Approved</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted">
                      <ShieldAlert size={20} />
                      <span className="font-semibold">Not OSI Approved or Unknown</span>
                    </div>
                  )}
                </div>
                
                {licenseInfo.url && (
                  <div>
                    <span className="text-sm text-muted block mb-2 font-semibold">License Text</span>
                    <a 
                      href={licenseInfo.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 text-primary font-semibold"
                    >
                      {licenseInfo.url} <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted">No additional information found for this license identifier.</p>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Usage Summary</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Package size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Components</span>
                </div>
                <div className="text-2xl font-bold">{stats?.totalComponents || 0}</div>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Building2 size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Organisations</span>
                </div>
                <div className="text-2xl font-bold">{stats?.numOrganisations || 0}</div>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Layers size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Applications</span>
                </div>
                <div className="text-2xl font-bold">{stats?.numApplications || 0}</div>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <GitBranch size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Repositories</span>
                </div>
                <div className="text-2xl font-bold">{stats?.numRepositories || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Usage across Projects</h3>
        </div>
        {!usage || usage.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">No usage found for this license in the latest SBOMs.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Application / Repo</th>
                  <th>Component</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((item, index) => {
                  const repoUrl = getRepositoryUrl(item.purl);
                  return (
                    <tr key={index}>
                      <td className="font-bold">{item.organisation_name}</td>
                      <td>
                        <div className="font-bold">{item.product_name}</div>
                        <div className="text-sm text-muted">{item.repository_name}</div>
                      </td>
                      <td className="font-bold">
                        <div className="flex items-center gap-2">
                          {item.component_name}
                          {repoUrl && (
                            <a 
                              href={repoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-muted hover:text-primary transition-colors"
                              title="View in official repository"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td>{item.version}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LicenseDetail;
