package scanner

import (
	"context"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"github.com/netfoe/scapegoat/backend/internal/vulnerability"
)

type OSVScanner struct{}

func (s *OSVScanner) Name() string {
	return "osv"
}

func (s *OSVScanner) IdentifyVulnerabilities(ctx context.Context, sbom *models.SBOM, dirPath string) (map[string][]models.Vulnerability, error) {
	return vulnerability.FetchVulnerabilities(sbom.Components)
}
