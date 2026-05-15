package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"

	"github.com/netfoe/scapegoat/backend/internal/models"
)

type GrypeScanner struct{}

func (s *GrypeScanner) Name() string {
	return "grype"
}

type grypeOutput struct {
	Matches []struct {
		Vulnerability struct {
			ID          string `json:"id"`
			Severity    string `json:"severity"`
			Description string `json:"description"`
		} `json:"vulnerability"`
		Artifact struct {
			PURL string `json:"purl"`
		} `json:"artifact"`
	} `json:"matches"`
}

func (s *GrypeScanner) IdentifyVulnerabilities(ctx context.Context, sbom *models.SBOM, dirPath string) (map[string][]models.Vulnerability, error) {
	if dirPath == "" {
		// Fallback: If no dirPath, we can't easily run grype without a standard SBOM.
		// For now, let's just return empty results or an error if we prefer.
		return nil, nil
	}

	// Run grype on the directory
	cmd := exec.CommandContext(ctx, "grype", "dir:"+dirPath, "-o", "json")
	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			// If it's an exit error, we still might have output if it's just findings
			if len(output) == 0 {
				return nil, fmt.Errorf("grype failed with no output: %w (stderr: %s)", err, string(exitErr.Stderr))
			}
		} else {
			return nil, fmt.Errorf("failed to run grype: %w", err)
		}
	}


	var gOut grypeOutput
	if err := json.Unmarshal(output, &gOut); err != nil {
		return nil, fmt.Errorf("failed to unmarshal grype output: %w", err)
	}

	vulnMap := make(map[string][]models.Vulnerability)
	for _, m := range gOut.Matches {
		purl := m.Artifact.PURL
		if purl == "" {
			continue
		}

		v := models.Vulnerability{
			OSVID:    m.Vulnerability.ID,
			Severity: m.Vulnerability.Severity,
			Summary:  m.Vulnerability.Description,
		}
		vulnMap[purl] = append(vulnMap[purl], v)
	}

	return vulnMap, nil
}
