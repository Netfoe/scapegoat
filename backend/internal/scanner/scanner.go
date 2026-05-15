package scanner

import (
	"context"
	"github.com/netfoe/scapegoat/backend/internal/models"
)

// SBOMScanner defines the interface for generating an SBOM from a directory
type SBOMScanner interface {
	Scan(ctx context.Context, dirPath string) (*models.SBOM, error)
	Name() string
}

// VulnerabilityScanner defines the interface for identifying vulnerabilities in components
type VulnerabilityScanner interface {
	IdentifyVulnerabilities(ctx context.Context, sbom *models.SBOM, dirPath string) (map[string][]models.Vulnerability, error)
	Name() string
}
