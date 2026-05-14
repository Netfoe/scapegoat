package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"github.com/netfoe/scapegoat/backend/internal/queue"
	"gorm.io/gorm"
)

// CreateOrganisation handles creating a new organisation
// @Summary Create a new organisation
// @Description Create a new organisation with the given name
// @Tags organisations
// @Accept json
// @Produce json
// @Param organisation body CreateOrganisationInput true "Organisation object"
// @Success 201 {object} models.Organisation
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /organisations [post]
func CreateOrganisation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input CreateOrganisationInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		org := models.Organisation{Name: input.Name}
		if err := db.Create(&org).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organisation"})
			return
		}
		c.JSON(http.StatusCreated, org)
	}
}

// ListOrganisations returns a list of all organisations
// @Summary List organisations
// @Description Get a list of all organisations
// @Tags organisations
// @Produce json
// @Success 200 {array} models.Organisation
// @Router /organisations [get]
func ListOrganisations(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var orgs []models.Organisation
		db.Find(&orgs)
		c.JSON(http.StatusOK, orgs)
	}
}

// UpdateOrganisation updates an existing organisation
// @Summary Update an organisation
// @Description Update the name of an existing organisation
// @Tags organisations
// @Accept json
// @Produce json
// @Param id path int true "Organisation ID"
// @Param organisation body CreateOrganisationInput true "Organisation object"
// @Success 200 {object} models.Organisation
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /organisations/{id} [put]
func UpdateOrganisation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input CreateOrganisationInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var org models.Organisation
		if err := db.First(&org, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Organisation not found"})
			return
		}

		org.Name = input.Name
		if err := db.Save(&org).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update organisation"})
			return
		}
		c.JSON(http.StatusOK, org)
	}
}

// DeleteOrganisation deletes an organisation
// @Summary Delete an organisation
// @Description Delete an organisation by ID
// @Tags organisations
// @Param id path int true "Organisation ID"
// @Success 200 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /organisations/{id} [delete]
func DeleteOrganisation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := db.Delete(&models.Organisation{}, id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete organisation"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Organisation deleted"})
	}
}

// Products

// CreateProduct creates a new product
// @Summary Create a new product
// @Description Create a new product under an organisation
// @Tags products
// @Accept json
// @Produce json
// @Param product body CreateProductInput true "Product object"
// @Success 201 {object} models.Product
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /products [post]
func CreateProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input CreateProductInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		product := models.Product{OrganisationID: input.OrganisationID, Name: input.Name}
		if err := db.Create(&product).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
			return
		}
		c.JSON(http.StatusCreated, product)
	}
}

// ListProducts returns a list of products
// @Summary List products
// @Description Get a list of products, optionally filtered by organisation
// @Tags products
// @Produce json
// @Param organisation_id query int false "Organisation ID to filter by"
// @Success 200 {array} models.Product
// @Router /products [get]
func ListProducts(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := c.Query("organisation_id")
		var products []models.Product
		query := db.Preload("Policy")
		if orgID != "" {
			query = query.Where("organisation_id = ?", orgID)
		}
		query.Find(&products)
		c.JSON(http.StatusOK, products)
	}
}

// Repositories

// CreateRepository creates a new repository
// @Summary Create a new repository
// @Description Create a new repository under a product
// @Tags repositories
// @Accept json
// @Produce json
// @Param repository body CreateRepositoryInput true "Repository object"
// @Success 201 {object} models.Repository
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /repositories [post]
func CreateRepository(db *gorm.DB, q *queue.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input CreateRepositoryInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		repo := models.Repository{
			ProductID:     input.ProductID,
			Name:          input.Name,
			RepoURL:       input.RepoURL,
			AuthMethod:    input.AuthMethod,
			SSHPrivateKey: input.SSHPrivateKey,
			SSHPublicKey:  input.SSHPublicKey,
			AuthToken:     input.AuthToken,
			Status:        "pending",
		}

		if err := db.Create(&repo).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create repository"})
			return
		}

		c.JSON(http.StatusCreated, repo)
	}
}

// ListRepositories returns a list of repositories
// @Summary List repositories
// @Description Get a list of repositories, optionally filtered by product or organisation
// @Tags repositories
// @Produce json
// @Param product_id query int false "Product ID to filter by"
// @Param organisation_id query int false "Organisation ID to filter by"
// @Success 200 {array} models.Repository
// @Router /repositories [get]
func ListRepositories(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID := c.Query("product_id")
		orgID := c.Query("organisation_id")
		var repos []models.Repository
		query := db
		if productID != "" {
			query = query.Where("product_id = ?", productID)
		}
		if orgID != "" {
			query = query.Joins("Product").Where("\"Product\".organisation_id = ?", orgID)
		}
		query.Find(&repos)
		c.JSON(http.StatusOK, repos)
	}
}

// GetRepository returns a single repository
// @Summary Get a repository
// @Description Get a repository by ID
// @Tags repositories
// @Produce json
// @Param id path int true "Repository ID"
// @Success 200 {object} models.Repository
// @Failure 404 {object} map[string]string
// @Router /repositories/{id} [get]
func GetRepository(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var repo models.Repository
		if err := db.First(&repo, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Repository not found"})
			return
		}
		c.JSON(http.StatusOK, repo)
	}
}

// TriggerScan triggers a scan for a repository
// @Summary Trigger a repository scan
// @Description Trigger a new SBOM scan for the given repository
// @Tags repositories
// @Produce json
// @Param id path int true "Repository ID"
// @Success 222 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /repositories/{id}/scan [post]
func TriggerScan(db *gorm.DB, q *queue.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var repo models.Repository
		if err := db.First(&repo, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Repository not found"})
			return
		}

		repo.Status = "pending"
		db.Save(&repo)

		// Queue scan job
		err := q.PushJob(c.Request.Context(), queue.ScanJob{
			RepositoryID: repo.ID,
			RepoURL:      repo.RepoURL,
		})

		if err != nil {
			log.Printf("Failed to queue scan job for repo %d: %v", repo.ID, err)
			repo.Status = "failed"
			db.Save(&repo)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue scan job"})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{"message": "Scan triggered", "status": "pending"})
	}
}

// ListRepositoryScans returns a list of scans for a repository
// @Summary List repository scans
// @Description Get a history of SBOM scans for a repository
// @Tags repositories
// @Produce json
// @Param id path int true "Repository ID"
// @Success 200 {array} models.SBOM
// @Failure 500 {object} map[string]string
// @Router /repositories/{id}/scans [get]
func ListRepositoryScans(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var sboms []models.SBOM
		if err := db.Where("repository_id = ?", id).Order("created_at desc").Find(&sboms).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scans"})
			return
		}
		c.JSON(http.StatusOK, sboms)
	}
}

// GetRepositorySBOM returns the latest SBOM for a repository
// @Summary Get repository SBOM
// @Description Get the most recent SBOM (with components and vulnerabilities) for a repository
// @Tags repositories
// @Produce json
// @Param id path int true "Repository ID"
// @Success 200 {object} models.SBOM
// @Failure 404 {object} map[string]string
// @Router /repositories/{id}/sbom [get]
func GetRepositorySBOM(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var sbom models.SBOM
		if err := db.Preload("Components.Vulnerabilities").Where("repository_id = ?", id).Order("created_at desc").First(&sbom).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "SBOM not found for this repository"})
			return
		}
		c.JSON(http.StatusOK, sbom)
	}
}
