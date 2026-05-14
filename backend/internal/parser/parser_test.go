package parser

import (
	"strings"
	"testing"
)

func TestParseCycloneDX(t *testing.T) {
	content := `{
		"bomFormat": "CycloneDX",
		"specVersion": "1.4",
		"components": [
			{
				"name": "react",
				"version": "18.2.0",
				"purl": "pkg:npm/react@18.2.0",
				"type": "library",
				"licenses": [
					{
						"license": {
							"id": "MIT"
						}
					}
				]
			}
		]
	}`

	sbom, err := DetectAndParse(strings.NewReader(content), "bom.json")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if sbom.Format != "CycloneDX" {
		t.Errorf("Expected format CycloneDX, got %s", sbom.Format)
	}

	if len(sbom.Components) != 1 {
		t.Errorf("Expected 1 component, got %d", len(sbom.Components))
	}

	if sbom.Components[0].Name != "react" {
		t.Errorf("Expected component name react, got %s", sbom.Components[0].Name)
	}
}

func TestParseSyft(t *testing.T) {
	content := `{
		"artifacts": [
			{
				"name": "stdlib",
				"version": "1.24.0",
				"purl": "pkg:golang/stdlib@1.24.0",
				"type": "binary",
				"licenses": [
					{
						"value": "BSD-3-Clause",
						"spdxExpression": "BSD-3-Clause"
					}
				]
			}
		],
		"descriptor": {
			"name": "syft",
			"version": "0.100.0"
		}
	}`

	sbom, err := DetectAndParse(strings.NewReader(content), "syft.json")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if sbom.Format != "Syft" {
		t.Errorf("Expected format Syft, got %s", sbom.Format)
	}

	if sbom.Components[0].Name != "stdlib" {
		t.Errorf("Expected component name stdlib, got %s", sbom.Components[0].Name)
	}
}

func TestParseSPDX3(t *testing.T) {
	content := `{
	  "@context" : "https://spdx.org/rdf/3.0.1/spdx-context.jsonld",
	  "@graph" : [ {
		"@id" : "_:creationInfo_0",
		"type" : "CreationInfo",
		"specVersion" : "3.0.1"
	  }, {
		"spdxId" : "https://spdx.org/spdxdocs/test/SPDXRef-gnrtd7",
		"type" : "software_Package",
		"software_packageVersion" : "0.14",
		"name" : "hyper",
		"software_packageUrl" : "pkg:cargo/hyper@0.14"
	  } ]
	}`

	sbom, err := DetectAndParse(strings.NewReader(content), "sbom.spdx3.json")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if sbom.Format != "SPDX" {
		t.Errorf("Expected format SPDX, got %s", sbom.Format)
	}

	if sbom.Version != "3.0.1" {
		t.Errorf("Expected version 3.0.1, got %s", sbom.Version)
	}

	if len(sbom.Components) != 1 {
		t.Errorf("Expected 1 component, got %d", len(sbom.Components))
	}

	if sbom.Components[0].Name != "hyper" {
		t.Errorf("Expected component name hyper, got %s", sbom.Components[0].Name)
	}
}
