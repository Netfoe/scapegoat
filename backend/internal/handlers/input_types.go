package handlers

type CreateOrganisationInput struct {
	Name string `json:"name" binding:"required"`
}

type CreateProductInput struct {
	OrganisationID uint   `json:"organisation_id" binding:"required"`
	Name           string `json:"name" binding:"required"`
}

type CreateRepositoryInput struct {
	ProductID     uint   `json:"product_id" binding:"required"`
	Name          string `json:"name" binding:"required"`
	RepoURL       string `json:"repo_url" binding:"required"`
	AuthMethod    string `json:"auth_method"`
	SSHPrivateKey string `json:"ssh_private_key"`
	SSHPublicKey  string `json:"ssh_public_key"`
	AuthToken     string `json:"auth_token"`
}

type GitHubRepoMapping struct {
	RepoName string `json:"repo_name" binding:"required"`
	AppName  string `json:"app_name" binding:"required"`
	RepoURL  string `json:"repo_url" binding:"required"`
	Private  bool   `json:"private"`
}

type GitHubImportInput struct {
	OrganisationID uint                `json:"organisation_id" binding:"required"`
	GitHubPAT      string              `json:"github_pat"`
	Mappings       []GitHubRepoMapping `json:"mappings" binding:"required"`
}

type CreatePolicyInput struct {
	OrganisationID     uint   `json:"organisation_id" binding:"required"`
	Name               string `json:"name" binding:"required"`
	AllowedLicenses    string `json:"allowed_licenses"`
	DisallowedLicenses string `json:"disallowed_licenses"`
	DisallowedDeps     string `json:"disallowed_deps"`
}

type UpdateProductPolicyInput struct {
	PolicyID *uint `json:"policy_id"`
}
