package models

import (
	"time"
	"gorm.io/gorm"
)

type Organisation struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Name      string         `json:"name" gorm:"uniqueIndex"`
	Products  []Product      `json:"products"`
	Policies  []Policy       `json:"policies"`
}

type Product struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	OrganisationID uint           `json:"organisation_id"`
	PolicyID       *uint          `json:"policy_id"`
	Policy         *Policy        `json:"policy,omitempty"`
	Name           string         `json:"name"`
	Repositories   []Repository   `json:"repositories"`
}

type Policy struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
	OrganisationID     uint           `json:"organisation_id"`
	Name               string         `json:"name"`
	AllowedLicenses    string         `json:"allowed_licenses"`    // Comma-separated
	DisallowedLicenses string         `json:"disallowed_licenses"` // Comma-separated
	DisallowedDeps     string         `json:"disallowed_deps"`     // Comma-separated (partial name match)
}

type Repository struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	ProductID uint           `json:"product_id"`
	Product   Product        `json:"product"`
	Name           string         `json:"name"`
	RepoURL        string         `json:"repo_url"`
	AuthMethod     string         `json:"auth_method"` // none, ssh
	SSHPrivateKey  string         `json:"ssh_private_key"`
	SSHPublicKey   string         `json:"ssh_public_key"`
	AuthToken      string         `json:"auth_token"`
	Status         string         `json:"status"` // pending, scanning, completed, failed
	LastScan  *time.Time     `json:"last_scan"`
	SBOMs     []SBOM         `json:"sboms"`
}

type SBOM struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	RepositoryID *uint          `json:"repository_id"`
	FileName     string         `json:"file_name"`
	Format       string         `json:"format"` // CycloneDX, SPDX, Syft
	Version      string         `json:"version"`
	Components   []Component    `gorm:"foreignKey:SBOMID" json:"components"`
}

type Component struct {
	ID               uint            `gorm:"primaryKey" json:"id"`
	SBOMID           uint            `json:"sbom_id"`
	Name             string          `json:"name"`
	Version          string          `json:"version"`
	License          string          `json:"license"`
	PURL             string          `json:"purl" gorm:"column:purl"`
	Type             string          `json:"type"`
	ComplianceStatus string          `json:"compliance_status"` // allowed, denied, unknown
	ComplianceReason string          `json:"compliance_reason"`
	Vulnerabilities  []Vulnerability `gorm:"many2many:component_vulnerabilities;" json:"vulnerabilities"`
}

type Vulnerability struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	OSVID     string         `json:"osv_id" gorm:"uniqueIndex"`
	Summary   string         `json:"summary"`
	Details   string         `json:"details"`
	Severity  string         `json:"severity"` // CRITICAL, HIGH, MEDIUM, LOW
	CVSS      string         `json:"cvss"`
}
