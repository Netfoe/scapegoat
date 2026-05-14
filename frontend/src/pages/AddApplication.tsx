import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useOrganisation } from '../context/OrganisationContext';
import { useTitle } from '../hooks/useTitle';
import { ChevronLeft, Package } from 'lucide-react';

export default function AddApplication() {
  useTitle('Add Application');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrganisation } = useOrganisation();
  const selectedOrgId = selectedOrganisation?.id;

  const [name, setName] = useState('');

  const createApplication = useMutation({
    mutationFn: (name: string) => api.createProduct(selectedOrgId!, name),
    onSuccess: (newApp) => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedOrgId] });
      navigate(`/applications/${newApp.id}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createApplication.mutate(name);
    }
  };

  if (!selectedOrgId) {
    return <div className="card">Please select an organisation first.</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto fade-in">
      <div className="flex items-center gap-2 text-muted mb-2">
        <Link to="/applications" className="hover:text-primary flex items-center gap-1">
          <ChevronLeft size={16} />
          Back to Applications
        </Link>
      </div>

      <div className="card">
        <div className="card-header border-b border-border pb-4 flex items-center gap-3">
          <div className="bg-primary-bg text-primary p-2 rounded">
            <Package size={24} />
          </div>
          <h2 className="card-title text-xl">Add New Application</h2>
        </div>
        <div className="card-content">
          <p className="text-muted mb-6">
            An application is a logical grouping of repositories. You can apply policies at the application level.
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Application Name</label>
              <input 
                id="name"
                className="input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. My Awesome Project"
                required
                autoFocus
              />
              <p className="text-xs text-muted mt-1">Choose a descriptive name for your application.</p>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <Link to="/applications" className="btn btn-outline">Cancel</Link>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={createApplication.isPending || !name.trim()}
              >
                {createApplication.isPending ? 'Creating...' : 'Create Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
