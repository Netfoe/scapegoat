import { AlertTriangle, CheckCircle2, FileCode, Layers, Package, XCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SBOM } from '../types';
import { getRepositoryUrl } from '../lib/purl';

export function SbomDetails({ sbom }: { sbom: SBOM }) {
  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="grid grid-cols-3">
        <div className="card stat-card">
          <div className="stat-card-header">
            <div className="flex flex-col">
              <span className="stat-label">Context</span>
              <span className="stat-value text-xl font-bold mt-1">{sbom.file_name}</span>
            </div>
            <FileCode size={20} className="text-muted" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-header">
            <div className="flex flex-col">
              <span className="stat-label">Format</span>
              <span className="stat-value text-xl font-bold mt-1">{sbom.format} <span className="text-muted text-sm">{sbom.version}</span></span>
            </div>
            <Layers size={20} className="text-muted" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-header">
            <div className="flex flex-col">
              <span className="stat-label">Components</span>
              <span className="stat-value text-xl font-bold mt-1">{sbom.components?.length || 0}</span>
            </div>
            <Package size={20} className="text-muted" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>License</th>
                <th>Compliance</th>
                <th>Vulnerabilities</th>
                <th>PURL</th>
              </tr>
            </thead>
            <tbody>
              {sbom.components?.map((comp) => {
                const repoUrl = getRepositoryUrl(comp.purl);
                return (
                  <tr key={comp.id}>
                    <td className="font-bold">
                      <div className="flex items-center gap-2">
                        {comp.name}
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
                    <td>{comp.version}</td>
                    <td>
                      {comp.license ? (
                        <Link to={`/licenses/${encodeURIComponent(comp.license)}`} className="no-underline">
                          <span className="badge badge-default bg-text-primary text-surface-color text-xs cursor-pointer hover:bg-primary transition-colors">
                            {comp.license}
                          </span>
                        </Link>
                      ) : (
                        <span className="badge badge-default bg-text-primary text-surface-color text-xs">
                          Unknown
                        </span>
                      )}
                    </td>
                    <td>
                      {comp.compliance_status ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`badge flex items-center gap-1 w-fit ${comp.compliance_status === 'allowed' ? 'badge-success' :
                              comp.compliance_status === 'denied' ? 'badge-danger' :
                                'badge-info'
                            }`}>
                            {comp.compliance_status === 'allowed' && <CheckCircle2 size={12} />}
                            {comp.compliance_status === 'denied' && <XCircle size={12} />}
                            {comp.compliance_status}
                          </span>
                          {comp.compliance_reason && (
                            <span className="text-muted text-xs">{comp.compliance_reason}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">N/A</span>
                      )}
                    </td>
                    <td>
                      {comp.vulnerabilities && comp.vulnerabilities.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          <span className={`badge flex items-center gap-1 ${comp.vulnerabilities.some(v => v.severity === 'CRITICAL' || v.severity === 'HIGH') ? 'badge-danger' :
                              comp.vulnerabilities.some(v => v.severity === 'MEDIUM') ? 'badge-warning' : 'badge-info'
                            }`} title={comp.vulnerabilities.map(v => `${v.osv_id}: ${v.summary}`).join('\n')}>
                            <AlertTriangle size={12} />
                            {comp.vulnerabilities.length} vulns
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">None</span>
                      )}
                    </td>
                    <td className="font-mono text-xs text-muted max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{comp.purl}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
