package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SearchDependencies searches for components by name across all organisations, products, and repositories
// @Summary Search for dependencies
// @Description Search for components by name (partial match) and return where they are used.
// @Tags search
// @Produce json
// @Param q query string true "Search query (component name)"
// @Success 200 {array} DependencyUsageResponse
// @Router /search/dependencies [get]
func SearchDependencies(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		queryParam := c.Query("q")
		if queryParam == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
			return
		}

		var usage []DependencyUsageResponse

		// We use a subquery to only consider the latest SBOM for each repository
		latestSBOMs := db.Table("sboms").
			Select("DISTINCT ON (repository_id) id").
			Order("repository_id, created_at DESC")

		err := db.Table("components").
			Select("organisations.name as organisation_name, products.name as product_name, repositories.name as repository_name, components.name as component_name, components.version, components.purl").
			Joins("JOIN sboms ON sboms.id = components.sbom_id").
			Joins("JOIN repositories ON repositories.id = sboms.repository_id").
			Joins("JOIN products ON products.id = repositories.product_id").
			Joins("JOIN organisations ON organisations.id = products.organisation_id").
			Where("components.name ILIKE ?", "%"+queryParam+"%").
			Where("sboms.id IN (?)", latestSBOMs).
			Scan(&usage).Error

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search dependencies"})
			return
		}

		c.JSON(http.StatusOK, usage)
	}
}
