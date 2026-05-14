package parser

import (
	"encoding/json"
	"fmt"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"io"
)

type Parser interface {
	Parse(r io.Reader) (*models.SBOM, error)
}

func DetectAndParse(r io.Reader, fileName string) (*models.SBOM, error) {
	// For simplicity, we'll try to peek at the content or use the extension
	// but here we will just try JSON parsers for now.

	content, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	// Try CycloneDX
	var cdv struct {
		BOMFormat string `json:"bomFormat"`
	}
	if err := json.Unmarshal(content, &cdv); err == nil && cdv.BOMFormat == "CycloneDX" {
		return ParseCycloneDX(content, fileName)
	}

	// Try Syft
	var syftv struct {
		Descriptor struct {
			Name string `json:"name"`
		} `json:"descriptor"`
	}
	if err := json.Unmarshal(content, &syftv); err == nil && syftv.Descriptor.Name == "syft" {
		return ParseSyft(content, fileName)
	}

	// Try SPDX (JSON)
	var spdxv struct {
		SPDXVersion string `json:"spdxVersion"`
		Context     string `json:"@context"`
		Graph       []any  `json:"@graph"`
	}
	if err := json.Unmarshal(content, &spdxv); err == nil {
		if spdxv.SPDXVersion != "" {
			return ParseSPDX(content, fileName)
		}
		if spdxv.Context != "" && len(spdxv.Graph) > 0 {
			return ParseSPDX3(content, fileName)
		}
	}

	return nil, fmt.Errorf("unsupported or unrecognized SBOM format")
}
