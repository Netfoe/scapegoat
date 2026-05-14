import { useState, useEffect, type ChangeEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { SbomDetails } from '../components/SbomDetails';
import type { SBOM } from '../types';
import { ArrowLeft, RefreshCw, Upload, FileText } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

export default function ProjectSbom() {
  const { id } = useParams<{ id: string }>();
  const { data: repository } = useQuery({
    queryKey: ['repository', id],
    queryFn: () => api.fetchRepository(id!),
    enabled: !!id,
  });

  useTitle(repository?.name ? `Repo: ${repository.name}` : 'Repository Detail');

  const queryClient = useQueryClient();
  const [selectedSbomId, setSelectedSbomId] = useState<number | null>(null);

  const { data: scans = [] } = useQuery({
    queryKey: ['scans', id],
    queryFn: () => api.fetchRepositoryScans(id!),
    enabled: !!id,
    refetchInterval: () => {
      return repository?.status === 'pending' || repository?.status === 'scanning' ? 5000 : false;
    }
  });

  const { data: selectedSbom, isLoading: isLoadingSbom } = useQuery({
    queryKey: ['sbom', selectedSbomId],
    queryFn: () => api.fetchSbom(selectedSbomId!.toString()),
    enabled: !!selectedSbomId,
  });

  // Automatically select the latest scan if none selected
  useEffect(() => {
    if (!selectedSbomId && scans.length > 0) {
      setSelectedSbomId(scans[0].id);
    }
  }, [scans, selectedSbomId]);

  const scanMutation = useMutation({
    mutationFn: () => api.triggerScan(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repository', id] });
      queryClient.invalidateQueries({ queryKey: ['scans', id] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadSbom(file, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans', id] });
    },
  });

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-4">
          <Link to={repository ? `/applications/${repository.product_id}` : "/applications"} className="btn btn-outline btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="page-title mb-0">{repository?.name || 'Repository Detail'}</h2>
            <p className="text-sm text-muted">{repository?.repo_url}</p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button 
            className="btn btn-primary" 
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending || repository?.status === 'pending' || repository?.status === 'scanning'}
          >
            <RefreshCw size={18} className={repository?.status === 'pending' || repository?.status === 'scanning' ? 'spinner' : ''} />
            {repository?.status === 'pending' || repository?.status === 'scanning' ? 'Scanning...' : 'Scan Now'}
          </button>
          
          <label className="btn btn-outline cursor-pointer">
            <Upload size={18} />
            {uploadMutation.isPending ? 'Processing...' : 'Manual Import'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadMutation.isPending} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr] items-start">
        {/* Scan History Sidebar */}
        <div className="card">
          <div className="card-header border-b border-border mb-4 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Scan History</h3>
          </div>
          <div className="card-content flex flex-col gap-2 pt-0">
            {scans.length === 0 && <p className="text-sm text-muted italic">No scans found.</p>}
            {scans.map((scan: SBOM) => (
              <button
                key={scan.id}
                onClick={() => setSelectedSbomId(scan.id)}
                className={`btn w-full justify-start items-start text-left flex-col p-4 border ${selectedSbomId === scan.id ? 'btn-primary' : 'btn-ghost border-border'}`}
              >
                <div className="font-medium">Scan #{scan.id}</div>
                <div className={`text-xs ${selectedSbomId === scan.id ? 'text-inverse' : 'text-muted'}`}>{new Date(scan.created_at).toLocaleString()}</div>
                <div className="mt-2">
                  <span className={`badge ${selectedSbomId === scan.id ? 'badge-default bg-inverse text-primary border-none' : 'badge-default'}`}>{scan.format} {scan.version}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* SBOM Details Area */}
        <div className="flex flex-col gap-6">
          {isLoadingSbom ? (
            <div className="card empty-state">
              <div className="spinner"></div>
              <span className="text-muted mt-4">Loading scan details...</span>
            </div>
          ) : selectedSbom ? (
            <SbomDetails sbom={selectedSbom} />
          ) : (
            <div className="card empty-state">
              <FileText size={48} className="empty-icon" />
              <h3 className="card-title">No Scan Selected</h3>
              <p className="text-muted">Select a scan from the history to view its details, or trigger a new scan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
