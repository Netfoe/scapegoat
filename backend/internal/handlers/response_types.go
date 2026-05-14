package handlers

type LicenseUsageResponse struct {
	OrganisationName string `json:"organisation_name"`
	ProductName      string `json:"product_name"`
	RepositoryName   string `json:"repository_name"`
	ComponentName    string `json:"component_name"`
	Version          string `json:"version"`
	PURL             string `json:"purl"`
}

type LicenseCountResponse struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type PolicyBreach struct {
	ProductName    string `json:"product_name"`
	RepositoryName string `json:"repository_name"`
	ComponentName  string `json:"component_name"`
	License        string `json:"license"`
	Reason         string `json:"reason"`
}

type PolicyDetailsResponse struct {
	Policy            interface{}    `json:"policy"`
	Products          interface{}    `json:"products"`
	Breaches          []PolicyBreach `json:"breaches"`
	CompliancePercent float64        `json:"compliance_percent"`
	TotalComponents   int64          `json:"total_components"`
	DeniedComponents  int64          `json:"denied_components"`
}

type DependencyUsageResponse struct {
	OrganisationName string `json:"organisation_name"`
	ProductName      string `json:"product_name"`
	RepositoryName   string `json:"repository_name"`
	ComponentName    string `json:"component_name"`
	Version          string `json:"version"`
	PURL             string `json:"purl"`
}
