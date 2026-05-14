package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DashboardStats struct {
	TotalDependencies int              `json:"total_dependencies"`
	Licenses          []DataPoint      `json:"licenses"`
	Ecosystems        []DataPoint      `json:"ecosystems"`
	Compliance        []DataPoint      `json:"compliance"` // allowed, denied, unknown
	Vulnerabilities   []DataPoint      `json:"vulnerabilities"`
}

type DataPoint struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

// GetDashboardStats returns aggregated statistics for the dashboard
// @Summary Get dashboard statistics
// @Description Get aggregated stats including total dependencies, license distribution, ecosystem distribution, compliance status, and vulnerability severity counts.
// @Tags dashboard
// @Produce json
// @Param organisation_id query int false "Organisation ID to filter by"
// @Param product_id query int false "Product ID to filter by"
// @Param repository_id query int false "Repository ID to filter by"
// @Success 200 {object} DashboardStats
// @Failure 500 {object} map[string]string
// @Router /dashboard/stats [get]
func GetDashboardStats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := c.Query("organisation_id")
		productID := c.Query("product_id")
		repoID := c.Query("repository_id")

		// Query to get the latest SBOM ID for each repository within the filtered scope
		subQuery := db.Table("sboms").
			Select("DISTINCT ON (sboms.repository_id) sboms.id").
			Order("sboms.repository_id, sboms.created_at DESC")

		if repoID != "" {
			subQuery = subQuery.Where("sboms.repository_id = ?", repoID)
		} else if productID != "" {
			subQuery = subQuery.Joins("JOIN repositories ON repositories.id = sboms.repository_id").
				Where("repositories.product_id = ?", productID)
		} else if orgID != "" {
			subQuery = subQuery.Joins("JOIN repositories ON repositories.id = sboms.repository_id").
				Joins("JOIN products ON products.id = repositories.product_id").
				Where("products.organisation_id = ?", orgID)
		}

		var sbomIDs []uint
		if err := db.Table("(?) as latest_sboms", subQuery).Pluck("id", &sbomIDs).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch latest SBOMs"})
			return
		}

		if len(sbomIDs) == 0 {
			c.JSON(http.StatusOK, DashboardStats{
				TotalDependencies: 0,
				Licenses:          []DataPoint{},
				Ecosystems:        []DataPoint{},
				Compliance:         []DataPoint{},
				Vulnerabilities:   []DataPoint{},
			})
			return
		}

		stats := DashboardStats{
			Licenses:        []DataPoint{},
			Ecosystems:       []DataPoint{},
			Compliance:      []DataPoint{},
			Vulnerabilities: []DataPoint{},
		}

		// Total dependencies
		var total int64
		db.Table("components").Where("sbom_id IN ?", sbomIDs).Count(&total)
		stats.TotalDependencies = int(total)

		// Licenses
		db.Table("components").
			Select("COALESCE(NULLIF(license, ''), 'Unknown') as name, count(*) as value").
			Where("sbom_id IN ?", sbomIDs).
			Group("COALESCE(NULLIF(license, ''), 'Unknown')").
			Order("value DESC").
			Scan(&stats.Licenses)

		// Compliance
		db.Table("components").
			Select("compliance_status as name, count(*) as value").
			Where("sbom_id IN ?", sbomIDs).
			Group("compliance_status").
			Scan(&stats.Compliance)

		// Vulnerabilities
		db.Table("vulnerabilities").
			Select("severity as name, count(*) as value").
			Joins("JOIN component_vulnerabilities ON component_vulnerabilities.vulnerability_id = vulnerabilities.id").
			Joins("JOIN components ON components.id = component_vulnerabilities.component_id").
			Where("components.sbom_id IN ?", sbomIDs).
			Group("severity").
			Order("CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END").
			Scan(&stats.Vulnerabilities)

		// Ecosystems (derived from P_URL)
		var rawEcosystems []struct {
			PURL  string `gorm:"column:p_url"`
			Count int
		}
		db.Table("components").
			Select("p_url, count(*) as count").
			Where("sbom_id IN ?", sbomIDs).
			Group("p_url").
			Scan(&rawEcosystems)

		ecosystemMap := make(map[string]int)
		for _, row := range rawEcosystems {
			eco := "Unknown"
			if strings.HasPrefix(row.PURL, "pkg:") {
				parts := strings.SplitN(row.PURL[4:], "/", 2)
				if len(parts) > 0 {
					eco = parts[0]
				}
			}
			ecosystemMap[eco] += row.Count
		}

		for name, value := range ecosystemMap {
			stats.Ecosystems = append(stats.Ecosystems, DataPoint{Name: name, Value: value})
		}

		c.JSON(http.StatusOK, stats)
	}
}
