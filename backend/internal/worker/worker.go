package worker

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"github.com/netfoe/scapegoat/backend/internal/parser"
	"github.com/netfoe/scapegoat/backend/internal/policy"
	"github.com/netfoe/scapegoat/backend/internal/queue"
	"github.com/netfoe/scapegoat/backend/internal/vulnerability"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Worker struct {
	db    *gorm.DB
	queue *queue.Client
}

func NewWorker(db *gorm.DB, q *queue.Client) *Worker {
	return &Worker{db: db, queue: q}
}

func (w *Worker) Start(ctx context.Context) {
	log.Println("Worker started, waiting for jobs...")
	for {
		select {
		case <-ctx.Done():
			return
		default:
			job, err := w.queue.PopJob(ctx)
			if err != nil {
				log.Printf("Error popping job: %v", err)
				time.Sleep(2 * time.Second)
				continue
			}
			w.processJob(ctx, job)
		}
	}
}

func (w *Worker) processJob(ctx context.Context, job *queue.ScanJob) {
	log.Printf("Processing job for repository %d: %s", job.RepositoryID, job.RepoURL)

	// Fetch Repo info
	var repo models.Repository
	if err := w.db.Preload("Product.Policy").First(&repo, job.RepositoryID).Error; err != nil {
		w.failJob(job.RepositoryID, fmt.Errorf("failed to fetch repository: %v", err))
		return
	}

	// Update status to scanning
	w.db.Model(&models.Repository{}).Where("id = ?", job.RepositoryID).Update("status", "scanning")

	// 1. Create temp directory
	tmpDir := filepath.Join(os.TempDir(), "scapegoat-scan-"+uuid.New().String())
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		w.failJob(job.RepositoryID, fmt.Errorf("failed to create temp dir: %v", err))
		return
	}
	defer os.RemoveAll(tmpDir)

	// 2. Clone repo
	cloneURL := job.RepoURL
	if repo.AuthMethod == "github_pat" && repo.AuthToken != "" {
		// Embed PAT in URL for authentication
		// https://x-access-token:<token>@github.com/owner/repo.git
		// We assume job.RepoURL is standard https://github.com/owner/repo
		// To be safe, we'll do a simple replacement if it starts with https://
		const prefix = "https://"
		if len(cloneURL) > len(prefix) && cloneURL[:len(prefix)] == prefix {
			cloneURL = fmt.Sprintf("https://x-access-token:%s@%s", repo.AuthToken, cloneURL[len(prefix):])
		}
	}

	cmd := exec.Command("git", "clone", "--depth", "1", cloneURL, tmpDir)

	if repo.AuthMethod == "ssh" && repo.SSHPrivateKey != "" {
		keyFile := filepath.Join(os.TempDir(), "scapegoat-ssh-"+uuid.New().String())
		if err := os.WriteFile(keyFile, []byte(repo.SSHPrivateKey), 0600); err != nil {
			w.failJob(job.RepositoryID, fmt.Errorf("failed to write ssh key: %v", err))
			return
		}
		defer os.Remove(keyFile)
		cmd.Env = append(os.Environ(), fmt.Sprintf("GIT_SSH_COMMAND=ssh -i %s -o StrictHostKeyChecking=no", keyFile))
	}

	if err := cmd.Run(); err != nil {
		w.failJob(job.RepositoryID, fmt.Errorf("failed to clone repo: %v", err))
		return
	}

	// 3. Generate SBOM using Syft
	sbomPath := filepath.Join(tmpDir, "sbom.json")
	cmd = exec.Command("syft", "scan", "dir:"+tmpDir, "-o", "json", "--file", sbomPath)
	if err := cmd.Run(); err != nil {
		w.failJob(job.RepositoryID, fmt.Errorf("failed to run syft: %v", err))
		return
	}

	// 4. Parse and Save
	f, err := os.Open(sbomPath)
	if err != nil {
		w.failJob(job.RepositoryID, fmt.Errorf("failed to open generated sbom: %v", err))
		return
	}
	defer f.Close()

	sbom, err := parser.DetectAndParse(f, "syft-generated.json")
	if err != nil {
		w.failJob(job.RepositoryID, fmt.Errorf("failed to parse generated sbom: %v", err))
		return
	}

	sbom.RepositoryID = &job.RepositoryID
	now := time.Now()

	// 5. Fetch Vulnerabilities
	log.Printf("Fetching vulnerabilities for %d components", len(sbom.Components))
	vulnMap, err := vulnerability.FetchVulnerabilities(sbom.Components)
	if err != nil {
		log.Printf("Warning: failed to fetch vulnerabilities: %v", err)
	} else {
		// Map PURL to vulnerabilities
		for i := range sbom.Components {
			if vulns, ok := vulnMap[sbom.Components[i].PURL]; ok {
				sbom.Components[i].Vulnerabilities = vulns
			}
		}
	}

	// Fetch Policy for the product
	if repo.Product.Policy != nil {
		log.Printf("Applying policy '%s' to scan results", repo.Product.Policy.Name)
		for i := range sbom.Components {
			result := policy.EvaluateComponent(sbom.Components[i], repo.Product.Policy)
			sbom.Components[i].ComplianceStatus = result.Status
			sbom.Components[i].ComplianceReason = result.Reason
		}
	} else {
		log.Printf("No policy found for product %d", repo.ProductID)
		for i := range sbom.Components {
			sbom.Components[i].ComplianceStatus = "unknown"
			sbom.Components[i].ComplianceReason = "No policy attached to product"
		}
	}

	err = w.db.Transaction(func(tx *gorm.DB) error {
		// Upsert vulnerabilities first to handle duplicates
		for i := range sbom.Components {
			for j := range sbom.Components[i].Vulnerabilities {
				v := &sbom.Components[i].Vulnerabilities[j]
				if err := tx.Clauses(clause.OnConflict{
					Columns:   []clause.Column{{Name: "osv_id"}},
					DoUpdates: clause.AssignmentColumns([]string{"summary", "details", "severity"}),
				}).Create(v).Error; err != nil {
					return err
				}
			}
		}

		if err := tx.Create(sbom).Error; err != nil {
			return err
		}
		return tx.Model(&models.Repository{}).Where("id = ?", job.RepositoryID).Updates(map[string]any{
			"status":    "completed",
			"last_scan": &now,
		}).Error
	})

	if err != nil {
		w.failJob(job.RepositoryID, fmt.Errorf("failed to save scan results: %v", err))
		return
	}

	log.Printf("Successfully completed scan for repository %d", job.RepositoryID)
}

func (w *Worker) failJob(repositoryID uint, err error) {
	log.Printf("Job failed for repository %d: %v", repositoryID, err)
	w.db.Model(&models.Repository{}).Where("id = ?", repositoryID).Update("status", "failed")
}
