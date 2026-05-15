import { useState, useEffect, type FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useOrganisation } from '../context/OrganisationContext';
import { Link } from 'react-router-dom';
import { AlertCircle, BarChart2, Package, FileText, Layers, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const Dashboard: FC = () => {
  useTitle('Dashboard');
  const queryClient = useQueryClient();
  const { selectedOrganisation } = useOrganisation();
  const selectedOrg = selectedOrganisation?.id;
  
  const [selectedApplication, setSelectedApplication] = useState<number | undefined>();
  const [selectedRepo, setSelectedRepo] = useState<number | undefined>();

  // Reset local selections when organization changes
  useEffect(() => {
    setSelectedApplication(undefined);
    setSelectedRepo(undefined);
  }, [selectedOrg]);

  const { data: applications } = useQuery({ 
    queryKey: ['products', selectedOrg], 
    queryFn: () => api.fetchProducts(selectedOrg),
    enabled: !!selectedOrg
  });
  const { data: repos } = useQuery({ 
    queryKey: ['repositories', selectedApplication, selectedOrg], 
    queryFn: () => api.fetchRepositories(selectedApplication, selectedOrg),
    enabled: true
  });

  const { data: availablePolicies } = useQuery({
    queryKey: ['policies', selectedOrg],
    queryFn: () => api.fetchPolicies(selectedOrg),
    enabled: !!selectedOrg,
  });

  const updatePolicyMutation = useMutation({
    mutationFn: ({ applicationId, policyId }: { applicationId: number; policyId: number | null }) => 
      api.updateProductPolicy(applicationId, policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedOrg] });
    },
  });

  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardStats', selectedOrg, selectedApplication, selectedRepo],
    queryFn: () => api.fetchDashboardStats(selectedOrg, selectedApplication, selectedRepo)
  });

  const { data: vulnerabilities } = useQuery({
    queryKey: ['dashboardVulnerabilities', selectedOrg, selectedApplication, selectedRepo],
    queryFn: () => api.fetchDashboardVulnerabilities(selectedOrg, selectedApplication, selectedRepo)
  });

  if (isLoading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <span className="text-muted">Loading statistics...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card bg-danger-bg border-danger text-danger p-4 mt-4 flex gap-4">
        <AlertCircle size={24} />
        <div>
          <h3 className="font-bold">Error loading statistics</h3>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const hasData = stats && stats.total_dependencies > 0;

  return (
    <div className="flex flex-col gap-6 w-full fade-in">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="page-title">Dashboard</h2>
          {selectedOrganisation && <p className="page-subtitle">Viewing data for {selectedOrganisation.name}</p>}
        </div>
        
        <div className="flex gap-4 items-center">
          <select 
            className="select"
            value={selectedApplication || ''}
            onChange={(e) => {
              setSelectedApplication(e.target.value ? Number(e.target.value) : undefined);
              setSelectedRepo(undefined);
            }}
          >
            <option value="">All Applications</option>
            {applications?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select 
            className="select"
            value={selectedRepo || ''}
            onChange={(e) => setSelectedRepo(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Repositories</option>
            {repos?.filter(r => !selectedApplication || r.product_id === selectedApplication).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {selectedApplication && (
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="text-sm font-semibold">Policy:</span>
              <select 
                className="select"
                value={applications?.find(p => p.id === selectedApplication)?.policy_id || ''}
                onChange={(e) => {
                  const policyId = e.target.value ? Number(e.target.value) : null;
                  updatePolicyMutation.mutate({ applicationId: selectedApplication, policyId });
                }}
              >
                <option value="">No Policy</option>
                {availablePolicies?.map(policy => (
                  <option key={policy.id} value={policy.id}>{policy.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="card empty-state">
          <BarChart2 size={48} className="empty-icon" />
          <h3 className="text-xl font-bold">No data available</h3>
          <p className="text-muted mt-2">
            Upload an SBOM or scan a repository to see statistics and visualizations here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5">
            <div className="card stat-card border-primary">
              <div className="stat-card-header">
                <div className="flex flex-col">
                  <span className="stat-label">Total Dependencies</span>
                  <span className="stat-value">{stats.total_dependencies}</span>
                </div>
                <Package size={20} className="text-muted" />
              </div>
            </div>
            <Link to="/licenses" className="card stat-card border-success no-underline">
              <div className="stat-card-header">
                <div className="flex flex-col">
                  <span className="stat-label">Unique Licenses</span>
                  <span className="stat-value">{stats.licenses?.length || 0}</span>
                </div>
                <FileText size={20} className="text-muted" />
              </div>
            </Link>
            <div className="card stat-card border-warning">
              <div className="stat-card-header">
                <div className="flex flex-col">
                  <span className="stat-label">Ecosystems</span>
                  <span className="stat-value">{stats.ecosystems?.length || 0}</span>
                </div>
                <Layers size={20} className="text-muted" />
              </div>
            </div>
            <div className={`card stat-card ${stats.compliance?.find((c: any) => c.name === 'denied')?.value > 0 ? 'border-danger' : 'border-success'}`}>
              <div className="stat-card-header">
                <div className="flex flex-col">
                  <span className="stat-label">Compliance</span>
                  <span className={`stat-value ${stats.compliance?.find((c: any) => c.name === 'denied')?.value > 0 ? 'text-danger' : ''}`}>
                    {stats.compliance?.find((c: any) => c.name === 'denied')?.value || 0} Breaches
                  </span>
                </div>
                {stats.compliance?.find((c: any) => c.name === 'denied')?.value > 0 ? 
                  <ShieldAlert size={20} className="text-danger" /> : 
                  <ShieldCheck size={20} className="text-success" />
                }
              </div>
            </div>
            <div className={`card stat-card ${stats.vulnerabilities?.some((v: any) => ['CRITICAL', 'HIGH'].includes(v.name)) ? 'border-danger' : 'border-success'}`}>
              <div className="stat-card-header">
                <div className="flex flex-col">
                  <span className="stat-label">Vulnerabilities</span>
                  <span className={`stat-value ${stats.vulnerabilities?.some((v: any) => ['CRITICAL', 'HIGH'].includes(v.name)) ? 'text-danger' : ''}`}>
                    {stats.vulnerabilities?.reduce((acc: number, v: any) => acc + v.value, 0) || 0} Total
                  </span>
                </div>
                <AlertTriangle size={20} className={stats.vulnerabilities?.some((v: any) => ['CRITICAL', 'HIGH'].includes(v.name)) ? 'text-danger' : 'text-muted'} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4">
            <div className="card">
              <div className="card-header"><h3 className="card-title">Vulnerabilities by Severity</h3></div>
              <div className="card-content chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.vulnerabilities || []}>
                      <XAxis dataKey="name" className="chart-axis" />
                      <YAxis className="chart-axis" />
                      <Tooltip />
                      <Bar dataKey="value" name="Count">
                        {stats.vulnerabilities?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.name === 'CRITICAL' ? '#7f1d1d' : 
                            entry.name === 'HIGH' ? '#dc2626' : 
                            entry.name === 'MEDIUM' ? '#f59e0b' : 
                            entry.name === 'LOW' ? '#34d399' : '#6B7280'
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Compliance</h3></div>
              <div className="card-content chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.compliance || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.compliance?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.name === 'allowed' ? '#10B981' : 
                            entry.name === 'denied' ? '#EF4444' : '#6B7280'
                          } />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">License Distribution</h3></div>
              <div className="card-content chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.licenses?.slice(0, 5) || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.licenses?.slice(0, 5)?.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Ecosystem Distribution</h3></div>
              <div className="card-content chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.ecosystems || []} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} className="chart-axis" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#82ca9d" name="Deps" />
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">License Breakdown</h3></div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>License</th>
                    <th>Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.licenses || []).map((license: any, index: number) => (
                    <tr key={index}>
                      <td className="font-semibold">
                        <Link to={`/licenses/${encodeURIComponent(license.name)}`}>
                          {license.name}
                        </Link>
                      </td>
                      <td>{license.value}</td>
                      <td>
                        {((license.value / stats.total_dependencies) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Vulnerabilities</h3></div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>ID</th>
                    <th>Summary</th>
                    <th>Component</th>
                    <th>Application / Repo</th>
                  </tr>
                </thead>
                <tbody>
                  {(vulnerabilities || []).length > 0 ? (
                    vulnerabilities?.map((v, index) => (
                      <tr key={index}>
                        <td>
                          <span className={`badge ${
                            v.severity === 'CRITICAL' ? 'bg-danger text-white' :
                            v.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                            v.severity === 'MEDIUM' ? 'bg-warning text-black' :
                            v.severity === 'LOW' ? 'bg-success text-white' : 'bg-gray-500 text-white'
                          } px-2 py-1 rounded text-xs font-bold`}>
                            {v.severity}
                          </span>
                        </td>
                        <td className="font-mono text-sm">{v.osv_id}</td>
                        <td className="max-w-md truncate" title={v.summary}>{v.summary}</td>
                        <td>
                          <div className="font-semibold">{v.component_name}</div>
                          <div className="text-xs text-muted">{v.component_version}</div>
                        </td>
                        <td>
                          <div className="font-semibold">{v.product_name}</div>
                          <div className="text-xs text-muted">{v.repository_name}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted">
                        No vulnerabilities found in the current scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
