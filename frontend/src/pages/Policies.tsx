import { useState, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Policy } from '../types';
import { useOrganisation } from '../context/OrganisationContext';
import { Plus, X, ChevronRight } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

const Policies: FC = () => {
  useTitle('Policies');
  const queryClient = useQueryClient();
  const { selectedOrganisation } = useOrganisation();
  const selectedOrg = selectedOrganisation?.id;
  
  const [showCreate, setShowCreate] = useState(false);
  const [newPolicy, setNewPolicy] = useState<Partial<Policy>>({
    name: '',
    allowed_licenses: '',
    disallowed_licenses: '',
    disallowed_deps: '',
  });

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies', selectedOrg],
    queryFn: () => api.fetchPolicies(selectedOrg),
    enabled: !!selectedOrg,
  });

  const createPolicyMutation = useMutation({
    mutationFn: (p: Partial<Policy>) => api.createPolicy({ ...p, organisation_id: selectedOrg }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies', selectedOrg] });
      setShowCreate(false);
      setNewPolicy({ name: '', allowed_licenses: '', disallowed_licenses: '', disallowed_deps: '' });
    },
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createPolicyMutation.mutate(newPolicy);
  };

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="page-title">Policies</h2>
          {selectedOrganisation && <p className="page-subtitle">Policies for {selectedOrganisation.name}</p>}
        </div>
        {selectedOrg && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={`btn ${showCreate ? 'btn-outline' : 'btn-primary'}`}
          >
            {showCreate ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Create New Policy</>}
          </button>
        )}
      </div>

      {!selectedOrg ? (
        <div className="card empty-state">
          <h3 className="card-title">No Organisation Selected</h3>
          <p className="text-muted mt-2">Please select an organisation from the switcher above to view policies.</p>
        </div>
      ) : (
        <>
          {showCreate && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">New Policy</h3></div>
              <div className="card-content">
                <form onSubmit={handleCreate} className="flex flex-col gap-4">
                  <div className="form-group">
                    <label className="form-label text-muted">Policy Name</label>
                    <input
                      type="text"
                      required
                      value={newPolicy.name}
                      onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                      placeholder="e.g. Standard Open Source Policy"
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-muted">Allowed Licenses (comma separated)</label>
                    <input
                      type="text"
                      value={newPolicy.allowed_licenses}
                      onChange={(e) => setNewPolicy({ ...newPolicy, allowed_licenses: e.target.value })}
                      placeholder="MIT, Apache-2.0, BSD-3-Clause"
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-muted">Disallowed Licenses (comma separated)</label>
                    <input
                      type="text"
                      value={newPolicy.disallowed_licenses}
                      onChange={(e) => setNewPolicy({ ...newPolicy, disallowed_licenses: e.target.value })}
                      placeholder="GPL-3.0, AGPL-3.0"
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-muted">Disallowed Dependencies (comma separated, partial match)</label>
                    <input
                      type="text"
                      value={newPolicy.disallowed_deps}
                      onChange={(e) => setNewPolicy({ ...newPolicy, disallowed_deps: e.target.value })}
                      placeholder="log4j, xz"
                      className="input"
                    />
                  </div>
                  <div className="mt-4">
                    <button
                      type="submit"
                      disabled={createPolicyMutation.isPending}
                      className="btn btn-primary w-full"
                    >
                      {createPolicyMutation.isPending ? 'Creating...' : 'Save Policy'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2">
            {isLoading ? (
              <div className="loader-container col-span-2">
                <div className="spinner"></div>
                <span className="text-muted">Loading policies...</span>
              </div>
            ) : policies?.length === 0 ? (
              <div className="card empty-state col-span-2">
                <p className="text-muted">No policies defined for this organisation.</p>
              </div>
            ) : (
              policies?.map((policy) => (
                <Link 
                  key={policy.id} 
                  to={`/policies/${policy.id}`}
                  className="card p-6 border-l-4 border-primary hover:bg-surface-hover transition-colors text-primary no-underline"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="card-title mb-0">{policy.name}</h3>
                    <ChevronRight size={20} className="text-muted" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="text-sm font-bold text-success">Allowed Licenses:</span>
                      <p className="text-sm text-muted font-mono mt-1">{policy.allowed_licenses || 'Any'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-danger">Disallowed Licenses:</span>
                      <p className="text-sm text-muted font-mono mt-1">{policy.disallowed_licenses || 'None'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-warning">Disallowed Dependencies:</span>
                      <p className="text-sm text-muted font-mono mt-1">{policy.disallowed_deps || 'None'}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Policies;
