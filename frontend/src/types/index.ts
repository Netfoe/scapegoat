export interface Vulnerability {
  id: number;
  osv_id: string;
  summary: string;
  details: string;
  severity: string;
}

export interface Component {
  id: number;
  name: string;
  version: string;
  license: string;
  purl: string;
  type: string;
  compliance_status?: string;
  compliance_reason?: string;
  vulnerabilities?: Vulnerability[];
}

export interface SBOM {
  id: number;
  created_at: string;
  file_name: string;
  format: string;
  version: string;
  components: Component[];
}

export interface Policy {
  id: number;
  organisation_id: number;
  name: string;
  allowed_licenses: string;
  disallowed_licenses: string;
  disallowed_deps: string;
}

export interface Organisation {
  id: number;
  name: string;
  created_at: string;
  policies?: Policy[];
}

export interface Product {
  id: number;
  organisation_id: number;
  policy_id?: number | null;
  policy?: Policy;
  name: string;
  created_at: string;
}

export interface Repository {
  id: number;
  product_id: number;
  name: string;
  repo_url: string;
  auth_method: string;
  ssh_private_key?: string;
  ssh_public_key?: string;
  status: string;
  last_scan: string | null;
}

export interface DataPoint {
  name: string;
  value: number;
}

export interface DashboardStats {
  total_dependencies: number;
  licenses: DataPoint[];
  ecosystems: DataPoint[];
  compliance: DataPoint[];
  vulnerabilities: DataPoint[];
}

export interface PolicyDetails {
  policy: Policy;
  products: Product[];
  breaches: {
    product_name: string;
    repository_name: string;
    component_name: string;
    license: string;
    reason: string;
  }[];
  compliance_percent: number;
  total_components: number;
  denied_components: number;
}

export interface LicenseUsage {
  organisation_name: string;
  product_name: string;
  repository_name: string;
  component_name: string;
  version: string;
  purl: string;
}

export interface DependencyUsage {
  organisation_name: string;
  product_name: string;
  repository_name: string;
  component_name: string;
  version: string;
  purl: string;
}

export interface VulnerabilityDashboard {
  osv_id: string;
  severity: string;
  summary: string;
  component_name: string;
  component_version: string;
  repository_name: string;
  product_name: string;
}
