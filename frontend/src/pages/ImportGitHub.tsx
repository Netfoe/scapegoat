import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useOrganisation } from '../context/OrganisationContext';
import { useTitle } from '../hooks/useTitle';
import { ChevronLeft, Code2, Search, Check, AlertCircle, Loader2 } from 'lucide-react';

interface RepoMapping {
  name: string;
  clone_url: string;
  private: boolean;
  appName: string;
  selected: boolean;
}

export default function ImportGitHub() {
  useTitle('Import from GitHub');
  const navigate = useNavigate();
  const { selectedOrganisation } = useOrganisation();
  const orgId = selectedOrganisation?.id;

  const [step, setStep] = useState(1);
  const [githubOrg, setGithubOrg] = useState('');
  const [githubPat, setGithubPat] = useState('');
  const [repos, setRepos] = useState<RepoMapping[]>([]);
  const [filter, setFilter] = useState('');

  const fetchRepos = useMutation({
    mutationFn: () => api.fetchGitHubRepos(githubOrg, githubPat),
    onSuccess: (data) => {
      setRepos(data.map((r: any) => ({
        name: r.name,
        clone_url: r.clone_url,
        private: r.private,
        appName: r.name, // 1 App per Repo default
        selected: true
      })));
      setStep(2);
    }
  });

  const importRepos = useMutation({
    mutationFn: () => {
      const mappings = repos
        .filter(r => r.selected)
        .map(r => ({
          repo_name: r.name,
          app_name: r.appName,
          repo_url: r.clone_url,
          private: r.private
        }));
      return api.importGitHubRepos(orgId!, githubPat, mappings);
    },
    onSuccess: () => {
      navigate('/applications');
    }
  });

  const handleFetch = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubOrg.trim()) {
      fetchRepos.mutate();
    }
  };

  const handleImport = () => {
    if (repos.some(r => r.selected)) {
      importRepos.mutate();
    }
  };

  const toggleSelectAll = (selected: boolean) => {
    setRepos(repos.map(r => ({ ...r, selected })));
  };

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(filter.toLowerCase()) || 
    r.appName.toLowerCase().includes(filter.toLowerCase())
  );

  if (!orgId) {
    return <div className="card">Please select an organisation first.</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full fade-in">
      <div className="flex items-center gap-2 text-muted mb-2">
        <Link to="/applications" className="hover:text-primary flex items-center gap-1">
          <ChevronLeft size={16} />
          Back to Applications
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="page-title">Import from GitHub Organization</h2>
          <p className="page-subtitle">Batch import repositories and map them to applications.</p>
        </div>
      </div>

      {step === 1 ? (
        <div className="card max-w-2xl mx-auto w-full">
          <div className="card-header border-b border-border pb-4 flex items-center gap-3">
            <div className="bg-primary-bg text-primary p-2 rounded">
              <Code2 size={24} />
            </div>
            <h3 className="card-title">GitHub Connection</h3>
          </div>
          <div className="card-content">
            <form onSubmit={handleFetch} className="flex flex-col gap-6">
              <div className="form-group">
                <label className="form-label">GitHub Organization Name</label>
                <input 
                  className="input"
                  value={githubOrg}
                  onChange={e => setGithubOrg(e.target.value)}
                  placeholder="e.g. google, facebook, your-org"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Personal Access Token (PAT) <span className="text-muted font-normal text-xs">(Optional for public repos)</span></label>
                <input 
                  type="password"
                  className="input"
                  value={githubPat}
                  onChange={e => setGithubPat(e.target.value)}
                  placeholder="ghp_..."
                />
                <p className="text-xs text-muted mt-1">
                  Required to fetch and scan private repositories. The token will be stored for future scans.
                </p>
              </div>

              {fetchRepos.isError && (
                <div className="bg-danger-bg text-danger p-3 rounded text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  Failed to fetch repositories. Please check the organization name and PAT.
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <Link to="/applications" className="btn btn-outline">Cancel</Link>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={fetchRepos.isPending || !githubOrg.trim()}
                >
                  {fetchRepos.isPending ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Fetching Repositories...
                    </>
                  ) : 'Fetch Repositories'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="card">
            <div className="card-header border-b border-border pb-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-primary-bg text-primary p-2 rounded">
                  <Search size={20} />
                </div>
                <div>
                  <h3 className="card-title">Map Repositories to Applications</h3>
                  <p className="text-sm text-muted">Found {repos.length} repositories in {githubOrg}</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="search-wrapper w-64">
                  <input 
                    className="input search-input" 
                    placeholder="Filter repositories..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                  />
                  <Search size={16} className="search-icon" />
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm" onClick={() => toggleSelectAll(true)}>Select All</button>
                  <button className="btn btn-outline btn-sm" onClick={() => toggleSelectAll(false)}>Deselect All</button>
                </div>
              </div>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>GitHub Repository</th>
                    <th>Type</th>
                    <th>Target Application Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRepos.map((repo) => (
                    <tr key={repo.name} className={repo.selected ? '' : 'opacity-50'}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={repo.selected}
                          onChange={e => {
                            const newRepos = [...repos];
                            const actualIdx = repos.findIndex(r => r.name === repo.name);
                            newRepos[actualIdx].selected = e.target.checked;
                            setRepos(newRepos);
                          }}
                        />
                      </td>
                      <td>
                        <div className="font-bold">{repo.name}</div>
                        <div className="text-xs text-muted font-mono">{repo.clone_url}</div>
                      </td>
                      <td>
                        <span className={`badge ${repo.private ? 'badge-danger' : 'badge-success'}`}>
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                      </td>
                      <td>
                        <input 
                          className="input"
                          value={repo.appName}
                          onChange={e => {
                            const newRepos = [...repos];
                            const actualIdx = repos.findIndex(r => r.name === repo.name);
                            newRepos[actualIdx].appName = e.target.value;
                            setRepos(newRepos);
                          }}
                          disabled={!repo.selected}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-footer border-t border-border pt-4 flex justify-between items-center">
              <span className="text-sm font-semibold">
                {repos.filter(r => r.selected).length} repositories selected for import
              </span>
              <div className="flex gap-3">
                <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleImport}
                  disabled={importRepos.isPending || !repos.some(r => r.selected)}
                >
                  {importRepos.isPending ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Import & Scan Selected
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
