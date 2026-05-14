package parser

import (
	"encoding/json"
	"github.com/netfoe/scapegoat/backend/internal/models"
)

type cycloneDXBOM struct {
	SpecVersion string `json:"specVersion"`
	Components  []struct {
		Name     string `json:"name"`
		Version  string `json:"version"`
		PURL     string `json:"purl"`
		Type     string `json:"type"`
		Licenses []struct {
			License struct {
				ID string `json:"id"`
			} `json:"license"`
		} `json:"licenses"`
	} `json:"components"`
}

func ParseCycloneDX(content []byte, fileName string) (*models.SBOM, error) {
	var bom cycloneDXBOM
	if err := json.Unmarshal(content, &bom); err != nil {
		return nil, err
	}

	sbom := &models.SBOM{
		FileName: fileName,
		Format:   "CycloneDX",
		Version:  bom.SpecVersion,
	}

	for _, c := range bom.Components {
		license := ""
		if len(c.Licenses) > 0 {
			license = c.Licenses[0].License.ID
		}
		sbom.Components = append(sbom.Components, models.Component{
			Name:    c.Name,
			Version: c.Version,
			PURL:    c.PURL,
			Type:    c.Type,
			License: license,
		})
	}

	return sbom, nil
}
