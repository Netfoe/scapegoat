import { useState, type FC } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useOrganisation } from '../context/OrganisationContext';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

const Settings: FC = () => {
  useTitle('Settings');
  const queryClient = useQueryClient();
  const { organisations, refreshOrganisations } = useOrganisation();
  const [newOrgName, setNewOrgName] = useState('');
  const [editingOrgId, setEditingOrgId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const createOrgMutation = useMutation({
    mutationFn: api.createOrganisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      refreshOrganisations();
      setNewOrgName('');
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.updateOrganisation(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      refreshOrganisations();
      setEditingOrgId(null);
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: api.deleteOrganisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      refreshOrganisations();
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrgName.trim()) {
      createOrgMutation.mutate(newOrgName);
    }
  };

  const startEditing = (id: number, name: string) => {
    setEditingOrgId(id);
    setEditingName(name);
  };

  const saveEdit = (id: number) => {
    if (editingName.trim()) {
      updateOrgMutation.mutate({ id, name: editingName });
    }
  };

  const confirmDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete organization "${name}"? All associated applications and repositories will be lost.`)) {
      deleteOrgMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full fade-in">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Global configuration and platform management.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Manage Organisations</h3>
          <p className="card-description">Create and manage organizations within your Scapegoat workspace.</p>
        </div>
        
        <div className="card-content flex flex-col gap-6">
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="New Organisation Name"
              className="input flex-1"
              required
            />
            <button className="btn btn-primary" type="submit" disabled={createOrgMutation.isPending}>
              {createOrgMutation.isPending ? 'Adding...' : <><Plus size={18} /> Add Organisation</>}
            </button>
          </form>

          <div className="table-container card">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Created At</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organisations.map((org) => (
                  <tr key={org.id}>
                    <td className="text-muted font-semibold">{org.id}</td>
                    <td>
                      {editingOrgId === org.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="input"
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold">{org.name}</span>
                      )}
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingOrgId === org.id ? (
                          <>
                            <button 
                              onClick={() => saveEdit(org.id)} 
                              className="btn btn-primary btn-sm"
                              disabled={updateOrgMutation.isPending}
                            >
                              <Save size={14} />
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingOrgId(null)} 
                              className="btn btn-outline btn-sm"
                            >
                              <X size={14} />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => startEditing(org.id, org.name)} 
                              className="btn btn-outline btn-sm"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button 
                              onClick={() => confirmDelete(org.id, org.name)} 
                              className="btn btn-danger btn-sm"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {organisations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-10">
                      No organisations found. Add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
