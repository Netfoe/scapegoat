import type { Organisation, Product, Repository, SBOM, Policy, PolicyDetails, LicenseUsage, DependencyUsage, VulnerabilityDashboard } from '../types';
import { zitadel } from '../auth';

const getEnv = (key: string, defaultValue: string): string => {
  return (window as any)._env_?.[key] || (import.meta as any).env[key] || defaultValue;
};

const API_URL = getEnv('VITE_API_URL', 'http://localhost:8081');

const getHeaders = async (isJson = true) => {
  const user = await zitadel.userManager.getUser();
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (user?.access_token) {
    headers['Authorization'] = `Bearer ${user.access_token}`;
  }
  return headers;
};

export const api = {
  // Organisations
  fetchOrganisations: async (): Promise<Organisation[]> => {
    const res = await fetch(`${API_URL}/api/v1/organisations`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch organisations');
    return res.json();
  },

  createOrganisation: async (name: string): Promise<Organisation> => {
    const res = await fetch(`${API_URL}/api/v1/organisations`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  updateOrganisation: async (id: number, name: string): Promise<Organisation> => {
    const res = await fetch(`${API_URL}/api/v1/organisations/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to update organisation');
    return res.json();
  },

  deleteOrganisation: async (id: number): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/api/v1/organisations/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(false),
    });
    if (!res.ok) throw new Error('Failed to delete organisation');
    return res.json();
  },

  // Products
  fetchProducts: async (orgId?: number): Promise<Product[]> => {
    const url = orgId ? `${API_URL}/api/v1/products?organisation_id=${orgId}` : `${API_URL}/api/v1/products`;
    const res = await fetch(url, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  createProduct: async (orgId: number, name: string): Promise<Product> => {
    const res = await fetch(`${API_URL}/api/v1/products`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ organisation_id: orgId, name }),
    });
    return res.json();
  },

  updateProductPolicy: async (productId: number, policyId: number | null): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/api/v1/products/${productId}/policy`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify({ policy_id: policyId }),
    });
    return res.json();
  },

  // Policies
  fetchPolicies: async (orgId?: number): Promise<Policy[]> => {
    const url = orgId ? `${API_URL}/api/v1/policies?organisation_id=${orgId}` : `${API_URL}/api/v1/policies`;
    const res = await fetch(url, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch policies');
    return res.json();
  },

  createPolicy: async (policy: Partial<Policy>): Promise<Policy> => {
    const res = await fetch(`${API_URL}/api/v1/policies`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(policy),
    });
    return res.json();
  },

  fetchPolicyDetails: async (id: string): Promise<PolicyDetails> => {
    const res = await fetch(`${API_URL}/api/v1/policies/${id}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch policy details');
    return res.json();
  },

  // Licenses
  fetchAllLicenses: async (orgId?: number): Promise<{ name: string; count: number }[]> => {
    const url = orgId ? `${API_URL}/api/v1/licenses?organisation_id=${orgId}` : `${API_URL}/api/v1/licenses`;
    const res = await fetch(url, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch licenses');
    return res.json();
  },

  fetchLicenseDetails: async (name: string, orgId?: number): Promise<LicenseUsage[]> => {
    const params = new URLSearchParams();
    if (orgId) params.append('organisation_id', orgId.toString());
    const url = `${API_URL}/api/v1/licenses/${encodeURIComponent(name)}${orgId ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch license details');
    return res.json();
  },

  // Repositories
  fetchRepositories: async (productId?: number, orgId?: number): Promise<Repository[]> => {
    const params = new URLSearchParams();
    if (productId) params.append('product_id', productId.toString());
    if (orgId) params.append('organisation_id', orgId.toString());
    const url = `${API_URL}/api/v1/repositories${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch repositories');
    return res.json();
  },

  createRepository: async (
    productId: number, 
    name: string, 
    repo_url: string, 
    auth_method: string = 'none', 
    ssh_private_key: string = '', 
    ssh_public_key: string = '',
    auth_token: string = ''
  ): Promise<Repository> => {
    const res = await fetch(`${API_URL}/api/v1/repositories`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ 
        product_id: productId, 
        name, 
        repo_url, 
        auth_method, 
        ssh_private_key, 
        ssh_public_key,
        auth_token
      }),
    });
    return res.json();
  },

  fetchGitHubRepos: async (org: string, pat: string = ''): Promise<any[]> => {
    const params = new URLSearchParams();
    if (pat) params.append('pat', pat);
    const res = await fetch(`${API_URL}/api/v1/github/orgs/${org}/repos?${params.toString()}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch GitHub repositories');
    return res.json();
  },

  importGitHubRepos: async (orgId: number, pat: string, mappings: any[]): Promise<any> => {
    const res = await fetch(`${API_URL}/api/v1/github/import`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ 
        organisation_id: orgId, 
        github_pat: pat, 
        mappings 
      }),
    });
    if (!res.ok) throw new Error('Failed to import GitHub repositories');
    return res.json();
  },

  fetchRepository: async (repoId: string): Promise<Repository> => {
    const res = await fetch(`${API_URL}/api/v1/repositories/${repoId}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch repository');
    return res.json();
  },

  triggerScan: async (repoId: string): Promise<{ message: string; status: string }> => {
    const res = await fetch(`${API_URL}/api/v1/repositories/${repoId}/scan`, {
      method: 'POST',
      headers: await getHeaders(false),
    });
    if (!res.ok) throw new Error('Failed to trigger scan');
    return res.json();
  },

  fetchRepositoryScans: async (repoId: string): Promise<SBOM[]> => {
    const res = await fetch(`${API_URL}/api/v1/repositories/${repoId}/scans`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch scans');
    return res.json();
  },

  fetchRepositorySbom: async (repoId: string): Promise<SBOM> => {
    const res = await fetch(`${API_URL}/api/v1/repositories/${repoId}/sbom`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch SBOM');
    return res.json();
  },

  fetchSbom: async (sbomId: string): Promise<SBOM> => {
    const res = await fetch(`${API_URL}/api/v1/sboms/${sbomId}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch SBOM details');
    return res.json();
  },

  uploadSbom: async (file: File, repositoryId?: string): Promise<SBOM> => {
    const formData = new FormData();
    formData.append('file', file);
    if (repositoryId) {
      formData.append('repository_id', repositoryId);
    }
    const res = await fetch(`${API_URL}/api/v1/sboms/upload`, {
      method: 'POST',
      headers: await getHeaders(false),
      body: formData,
    });
    return res.json();
  },

  // Dashboard
  fetchDashboardStats: async (orgId?: number, productId?: number, repoId?: number): Promise<any> => {
    const params = new URLSearchParams();
    if (orgId) params.append('organisation_id', orgId.toString());
    if (productId) params.append('product_id', productId.toString());
    if (repoId) params.append('repository_id', repoId.toString());
    
    const res = await fetch(`${API_URL}/api/v1/dashboard/stats?${params.toString()}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  fetchDashboardVulnerabilities: async (orgId?: number, productId?: number, repoId?: number): Promise<VulnerabilityDashboard[]> => {
    const params = new URLSearchParams();
    if (orgId) params.append('organisation_id', orgId.toString());
    if (productId) params.append('product_id', productId.toString());
    if (repoId) params.append('repository_id', repoId.toString());
    
    const res = await fetch(`${API_URL}/api/v1/dashboard/vulnerabilities?${params.toString()}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard vulnerabilities');
    return res.json();
  },

  searchDependencies: async (query: string): Promise<DependencyUsage[]> => {
    const res = await fetch(`${API_URL}/api/v1/search/dependencies?q=${encodeURIComponent(query)}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to search dependencies');
    return res.json();
  },
};
