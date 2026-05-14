package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"github.com/netfoe/scapegoat/backend/internal/queue"
	"gorm.io/gorm"
)

type GitHubRepo struct {
	Name     string `json:"name"`
	HTMLURL  string `json:"html_url"`
	CloneURL string `json:"clone_url"`
	Private  bool   `json:"private"`
}

// FetchGitHubRepos fetches repositories for a given GitHub organisation
func FetchGitHubRepos() gin.HandlerFunc {
	return func(c *gin.Context) {
		org := c.Param("org")
		pat := c.Query("pat")

		url := fmt.Sprintf("https://api.github.com/orgs/%s/repos?per_page=100", org)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		req.Header.Set("Accept", "application/vnd.github.v3+json")
		if pat != "" {
			req.Header.Set("Authorization", "Bearer "+pat)
		}

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch from GitHub"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			c.JSON(resp.StatusCode, gin.H{"error": "GitHub API error", "status": resp.Status})
			return
		}

		var repos []GitHubRepo
		if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode GitHub response"})
			return
		}

		c.JSON(http.StatusOK, repos)
	}
}

// ImportGitHubRepos handles batch import of repositories
func ImportGitHubRepos(db *gorm.DB, q *queue.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input GitHubImportInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var importedRepos []models.Repository

		err := db.Transaction(func(tx *gorm.DB) error {
			for _, mapping := range input.Mappings {
				// Find or create product (application)
				var product models.Product
				if err := tx.Where("organisation_id = ? AND name = ?", input.OrganisationID, mapping.AppName).First(&product).Error; err != nil {
					if err == gorm.ErrRecordNotFound {
						product = models.Product{
							OrganisationID: input.OrganisationID,
							Name:           mapping.AppName,
						}
						if err := tx.Create(&product).Error; err != nil {
							return err
						}
					} else {
						return err
					}
				}

				// Create repository
				authMethod := "none"
				if mapping.Private && input.GitHubPAT != "" {
					authMethod = "github_pat"
				}

				repo := models.Repository{
					ProductID:  product.ID,
					Name:       mapping.RepoName,
					RepoURL:    mapping.RepoURL,
					AuthMethod: authMethod,
					AuthToken:  input.GitHubPAT,
					Status:     "pending",
				}

				if err := tx.Create(&repo).Error; err != nil {
					return err
				}

				importedRepos = append(importedRepos, repo)
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import repositories: " + err.Error()})
			return
		}

		// Trigger scans for all imported repos
		for _, repo := range importedRepos {
			err := q.PushJob(c.Request.Context(), queue.ScanJob{
				RepositoryID: repo.ID,
				RepoURL:      repo.RepoURL,
			})
			if err != nil {
				log.Printf("Failed to queue scan job for imported repo %d: %v", repo.ID, err)
			}
		}

		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Successfully imported %d repositories", len(importedRepos))})
	}
}
