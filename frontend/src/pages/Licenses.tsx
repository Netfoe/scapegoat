import { useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { useOrganisation } from '../context/OrganisationContext';
import { Search, ChevronRight, FileText } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

const Licenses: FC = () => {
  useTitle('Licenses');
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedOrganisation } = useOrganisation();
  const selectedOrg = selectedOrganisation?.id;

  const { data: licenses, isLoading, isError } = useQuery({
    queryKey: ['licenses', selectedOrg],
    queryFn: () => api.fetchAllLicenses(selectedOrg),
  });

  const filteredLicenses = licenses?.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="page-title">Licenses</h2>
          <p className="page-subtitle">All licenses detected in your scanned repositories.</p>
        </div>
        <div className="search-wrapper max-w-sm">
          <input
            type="text"
            placeholder="Search licenses..."
            className="input search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={18} className="search-icon" />
        </div>
      </div>

      {isLoading ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <span className="text-muted">Loading licenses...</span>
        </div>
      ) : isError ? (
        <div className="card empty-state text-danger">Error loading licenses.</div>
      ) : filteredLicenses?.length === 0 ? (
         <div className="card empty-state">
           <FileText size={48} className="empty-icon" />
           <p className="text-muted font-bold text-lg">No licenses found matching "{searchTerm}"</p>
         </div>
      ) : (
        <div className="grid grid-cols-3">
          {filteredLicenses?.map((license) => (
            <Link 
              key={license.name} 
              to={`/licenses/${encodeURIComponent(license.name)}`}
              className="card p-6 flex flex-row justify-between items-center border-l-4 border-muted hover:border-primary transition-colors no-underline"
            >
              <div>
                <h3 className="card-title text-primary mb-1">{license.name}</h3>
                <p className="text-sm text-muted font-semibold">Found in {license.count} components</p>
              </div>
              <ChevronRight size={20} className="text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Licenses;
