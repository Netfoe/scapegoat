package scanner

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"github.com/netfoe/scapegoat/backend/internal/parser"
)

type SyftScanner struct{}

func (s *SyftScanner) Name() string {
	return "syft"
}

func (s *SyftScanner) Scan(ctx context.Context, dirPath string) (*models.SBOM, error) {
	sbomPath := filepath.Join(os.TempDir(), fmt.Sprintf("syft-sbom-%s.json", uuid.New().String()))
	defer os.Remove(sbomPath)

	cmd := exec.CommandContext(ctx, "syft", "scan", "dir:"+dirPath, "-o", "json", "--file", sbomPath)
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("failed to run syft: %w", err)
	}

	f, err := os.Open(sbomPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open syft output: %w", err)
	}
	defer f.Close()

	return parser.DetectAndParse(f, "syft-generated.json")
}
