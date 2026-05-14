package parser

import (
	"encoding/json"
	"github.com/netfoe/scapegoat/backend/internal/models"
)

type spdxBOM struct {
	SPDXVersion string `json:"spdxVersion"`
	Packages    []struct {
		Name         string `json:"name"`
		VersionInfo  string `json:"versionInfo"`
		ExternalRefs []struct {
			ReferenceLocator string `json:"referenceLocator"`
			ReferenceType    string `json:"referenceType"`
		} `json:"externalRefs"`
		LicenseConcluded string `json:"licenseConcluded"`
	} `json:"packages"`
}

func ParseSPDX(content []byte, fileName string) (*models.SBOM, error) {
	var bom spdxBOM
	if err := json.Unmarshal(content, &bom); err != nil {
		return nil, err
	}

	sbom := &models.SBOM{
		FileName: fileName,
		Format:   "SPDX",
		Version:  bom.SPDXVersion,
	}

	for _, p := range bom.Packages {
		purl := ""
		for _, ref := range p.ExternalRefs {
			if ref.ReferenceType == "purl" {
				purl = ref.ReferenceLocator
				break
			}
		}
		sbom.Components = append(sbom.Components, models.Component{
			Name:    p.Name,
			Version: p.VersionInfo,
			PURL:    purl,
			License: p.LicenseConcluded,
		})
	}

	return sbom, nil
}

type spdx3BOM struct {
	Graph []map[string]any `json:"@graph"`
}

func ParseSPDX3(content []byte, fileName string) (*models.SBOM, error) {
	var bom spdx3BOM
	if err := json.Unmarshal(content, &bom); err != nil {
		return nil, err
	}

	sbom := &models.SBOM{
		FileName: fileName,
		Format:   "SPDX",
		Version:  "3.0", // Defaulting to 3.0 for now
	}

	// We'll do a simple pass to find packages.
	// For licenses, we'd need to map relationships, which is complex for Phase 1.
	for _, item := range bom.Graph {
		itemType, ok := item["type"].(string)
		if !ok {
			continue
		}

		if itemType == "software_Package" {
			name, _ := item["name"].(string)
			version, _ := item["software_packageVersion"].(string)
			purl, _ := item["software_packageUrl"].(string)

			sbom.Components = append(sbom.Components, models.Component{
				Name:    name,
				Version: version,
				PURL:    purl,
				Type:    "library",
			})
		}
		
		if itemType == "CreationInfo" && sbom.Version == "3.0" {
			if v, ok := item["specVersion"].(string); ok {
				sbom.Version = v
			}
		}
	}

	return sbom, nil
}
