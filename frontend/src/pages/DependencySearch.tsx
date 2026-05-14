import { useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Search, ExternalLink } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';
import { getRepositoryUrl } from '../lib/purl';

const DependencySearch: FC = () => {
  useTitle('Dependency Search');
  const [searchTerm, setSearchTerm] = useState('');
  const [triggerSearch, setTriggerSearch] = useState('');

  const { data: results, isLoading, isError } = useQuery({
    queryKey: ['dependency-search', triggerSearch],
    queryFn: () => api.searchDependencies(triggerSearch),
    enabled: triggerSearch.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTriggerSearch(searchTerm);
  };

  return (
    <div className="flex flex-col gap-6 w-full fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="page-title">Dependency Search</h2>
        <p className="page-subtitle">Find where specific dependencies are used across your organizations, applications, and repositories.</p>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Enter dependency name (e.g. lodash, react)..."
              className="input search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search 
              size={18} 
              className="search-icon"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={isLoading || searchTerm.length === 0}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <span className="text-muted">Searching for dependencies...</span>
        </div>
      ) : isError ? (
        <div className="card empty-state text-danger">
          Error searching for dependencies. Please try again.
        </div>
      ) : triggerSearch && results?.length === 0 ? (
        <div className="card empty-state">
          <p className="text-muted font-semibold">No results found for "{triggerSearch}"</p>
        </div>
      ) : results ? (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Application</th>
                  <th>Repository</th>
                  <th>Component</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => {
                  const repoUrl = getRepositoryUrl(item.purl);
                  return (
                    <tr key={index}>
                      <td className="font-semibold">{item.organisation_name}</td>
                      <td>{item.product_name}</td>
                      <td>{item.repository_name}</td>
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
                      <td>
                        <span className="badge badge-default">{item.version}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <Search size={48} className="empty-icon" />
          <p className="text-muted">Enter a dependency name above to start searching across your workspace.</p>
        </div>
      )}
    </div>
  );
};

export default DependencySearch;
