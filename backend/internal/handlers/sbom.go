package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"github.com/netfoe/scapegoat/backend/internal/parser"
	"gorm.io/gorm"
	"net/http"
	"strconv"
)

// UploadSBOM handles uploading and parsing an SBOM file
// @Summary Upload an SBOM
// @Description Upload an SBOM file (CycloneDX, SPDX, or Syft) and parse its contents. Optionally associate it with a repository.
// @Tags sboms
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "SBOM file"
// @Param repository_id formData int false "Repository ID to associate the SBOM with"
// @Success 201 {object} models.SBOM
// @Failure 400 {object} map[string]string
// @Failure 422 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /sboms/upload [post]
func UploadSBOM(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
			return
		}

		repoIDStr := c.PostForm("repository_id")

		f, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
			return
		}
		defer f.Close()

		sbom, err := parser.DetectAndParse(f, file.Filename)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}

		if repoIDStr != "" {
			repoID, err := strconv.ParseUint(repoIDStr, 10, 32)
			if err == nil {
				uid := uint(repoID)
				sbom.RepositoryID = &uid
			}
		}

		if err := db.Create(sbom).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save SBOM to database"})
			return
		}

		c.JSON(http.StatusCreated, sbom)
	}
}

// GetSBOM returns a single SBOM by ID
// @Summary Get an SBOM
// @Description Get an SBOM by ID, including its components and vulnerabilities
// @Tags sboms
// @Produce json
// @Param id path int true "SBOM ID"
// @Success 200 {object} models.SBOM
// @Failure 404 {object} map[string]string
// @Router /sboms/{id} [get]
func GetSBOM(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var sbom models.SBOM
		if err := db.Preload("Components.Vulnerabilities").First(&sbom, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "SBOM not found"})
			return
		}
		c.JSON(http.StatusOK, sbom)
	}
}
