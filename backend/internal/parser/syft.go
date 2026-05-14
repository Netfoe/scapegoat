package parser

import (
	"encoding/json"
	"github.com/netfoe/scapegoat/backend/internal/models"
)

type syftBOM struct {
	Artifacts []struct {
		Name     string `json:"name"`
		Version  string `json:"version"`
		PURL     string `json:"purl"`
		Type     string `json:"type"`
		Licenses []struct {
			Value          string `json:"value"`
			SPDXExpression string `json:"spdxExpression"`
		} `json:"licenses"`
	} `json:"artifacts"`
	Descriptor struct {
		Version string `json:"version"`
	} `json:"descriptor"`
}

func ParseSyft(content []byte, fileName string) (*models.SBOM, error) {
	var bom syftBOM
	if err := json.Unmarshal(content, &bom); err != nil {
		return nil, err
	}

	sbom := &models.SBOM{
		FileName: fileName,
		Format:   "Syft",
		Version:  bom.Descriptor.Version,
	}

	for _, a := range bom.Artifacts {
		license := ""
		if len(a.Licenses) > 0 {
			license = a.Licenses[0].Value
			if a.Licenses[0].SPDXExpression != "" {
				license = a.Licenses[0].SPDXExpression
			}
		}
		sbom.Components = append(sbom.Components, models.Component{
			Name:    a.Name,
			Version: a.Version,
			PURL:    a.PURL,
			Type:    a.Type,
			License: license,
		})
	}

	return sbom, nil
}
