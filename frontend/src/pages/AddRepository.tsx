import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, GitBranch, Key } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useOrganisation } from '../context/OrganisationContext';
import { useTitle } from '../hooks/useTitle';

export default function AddRepository() {
  useTitle('Add Repository');
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrganisation } = useOrganisation();
  const selectedOrgId = selectedOrganisation?.id;

  const { data: applications = [] } = useQuery({
    queryKey: ['products', selectedOrgId],
    queryFn: () => api.fetchProducts(selectedOrgId!),
    enabled: !!selectedOrgId
  });

  const application = applications.find(a => a.id === appId);

  // Form state
  const [repoName, setRepoName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [authMethod, setAuthMethod] = useState('none');
  const [sshPrivateKey, setSshPrivateKey] = useState('');
  const [sshPublicKey, setSshPublicKey] = useState('');

  const createRepo = useMutation({
    mutationFn: ({ name, url, auth, priv, pub }: { name: string; url: string; auth: string; priv: string; pub: string }) =>
      api.createRepository(appId, name, url, auth, priv, pub),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories', appId, selectedOrgId] });
      navigate(`/applications/${appId}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRepo.mutate({
      name: repoName,
      url: repoUrl,
      auth: authMethod,
      priv: sshPrivateKey,
      pub: sshPublicKey
    });
  };

  if (!application) {
    return <div className="card">Application not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto fade-in">
      <div className="flex items-center gap-2 text-muted mb-2">
        <Link to={`/applications/${appId}`} className="hover:text-primary flex items-center gap-1">
          <ChevronLeft size={16} />
          Back to {application.name}
        </Link>
      </div>

      <div className="card">
        <div className="card-header border-b border-border pb-4 flex items-center gap-3">
          <div className="bg-primary-bg text-primary p-2 rounded">
            <GitBranch size={24} />
          </div>
          <h2 className="card-title text-xl">Add New Repository</h2>
        </div>
        <div className="card-content">
          <p className="text-muted mb-6">
            Add a Git repository to <span className="font-semibold text-foreground">{application.name}</span>.
            Scapegoat will scan it for SBOMs and dependencies.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="repoName">Repository Name</label>
                <input
                  id="repoName"
                  className="input"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  placeholder="e.g. My Frontend"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="repoUrl">Git URL</label>
                <input
                  id="repoUrl"
                  className="input"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="HTTPS or SSH URL"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="authMethod">Authentication Method</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="authMethod"
                    value="none"
                    checked={authMethod === 'none'}
                    onChange={() => setAuthMethod('none')}
                  />
                  <span>None (Public HTTPS)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="authMethod"
                    value="ssh"
                    checked={authMethod === 'ssh'}
                    onChange={() => setAuthMethod('ssh')}
                  />
                  <span>SSH Key (Private Repos)</span>
                </label>
              </div>
            </div>

            {authMethod === 'ssh' && (
              <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded border border-border">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Key size={16} />
                  SSH Key Configuration
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="form-group">
                    <label className="form-label">Public Key</label>
                    <textarea
                      className="textarea font-mono text-xs"
                      rows={3}
                      value={sshPublicKey}
                      onChange={e => setSshPublicKey(e.target.value)}
                      placeholder="ssh-rsa ..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Private Key</label>
                    <textarea
                      className="textarea font-mono text-xs"
                      rows={6}
                      value={sshPrivateKey}
                      onChange={e => setSshPrivateKey(e.target.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-4">
              <Link to={`/applications/${appId}`} className="btn btn-outline">Cancel</Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createRepo.isPending}
              >
                {createRepo.isPending ? 'Adding...' : 'Add Repository'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
