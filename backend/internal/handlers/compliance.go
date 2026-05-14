package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"gorm.io/gorm"
)

// GetPolicyDetails returns detailed information about a policy and its compliance breaches
// @Summary Get policy details
// @Description Get detailed information about a policy, including products using it, compliance percentage, and a list of components breaching the policy.
// @Tags policies
// @Produce json
// @Param id path int true "Policy ID"
// @Success 200 {object} PolicyDetailsResponse
// @Failure 404 {object} map[string]string
// @Router /policies/{id} [get]
func GetPolicyDetails(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var policy models.Policy
		if err := db.First(&policy, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Policy not found"})
			return
		}

		// Find products using this policy
		var products []models.Product
		db.Where("policy_id = ?", id).Find(&products)

		var productIDs []uint
		for _, p := range products {
			productIDs = append(productIDs, p.ID)
		}

		// Find breaches (denied components) in latest SBOMs of these products
		var breaches []PolicyBreach

		if len(productIDs) > 0 {
			db.Table("components").
				Select("products.name as product_name, repositories.name as repository_name, components.name as component_name, components.license, components.compliance_reason as reason").
				Joins("JOIN sboms ON sboms.id = components.sbom_id").
				Joins("JOIN repositories ON repositories.id = sboms.repository_id").
				Joins("JOIN products ON products.id = repositories.product_id").
				Where("products.id IN ?", productIDs).
				Where("components.compliance_status = ?", "denied").
				Where("sboms.id IN (SELECT DISTINCT ON (repository_id) id FROM sboms ORDER BY repository_id, created_at DESC)").
				Scan(&breaches)
		}

		// Calculate compliance percentage
		var totalComponents int64
		var deniedComponents int64
		if len(productIDs) > 0 {
			db.Table("components").
				Joins("JOIN sboms ON sboms.id = components.sbom_id").
				Joins("JOIN repositories ON repositories.id = sboms.repository_id").
				Where("repositories.product_id IN ?", productIDs).
				Where("sboms.id IN (SELECT DISTINCT ON (repository_id) id FROM sboms ORDER BY repository_id, created_at DESC)").
				Count(&totalComponents)

			db.Table("components").
				Joins("JOIN sboms ON sboms.id = components.sbom_id").
				Joins("JOIN repositories ON repositories.id = sboms.repository_id").
				Where("repositories.product_id IN ?", productIDs).
				Where("components.compliance_status = ?", "denied").
				Where("sboms.id IN (SELECT DISTINCT ON (repository_id) id FROM sboms ORDER BY repository_id, created_at DESC)").
				Count(&deniedComponents)
		}

		compliancePercent := 100.0
		if totalComponents > 0 {
			compliancePercent = float64(totalComponents-deniedComponents) / float64(totalComponents) * 100.0
		}

		c.JSON(http.StatusOK, PolicyDetailsResponse{
			Policy:             policy,
			Products:           products,
			Breaches:           breaches,
			CompliancePercent: compliancePercent,
			TotalComponents:   totalComponents,
			DeniedComponents:  deniedComponents,
		})
	}
}

// ListAllLicenses returns a list of all licenses found in the organisation's components
// @Summary List all licenses
// @Description Get a list of all unique licenses found in the latest SBOMs, with counts.
// @Tags compliance
// @Produce json
// @Param organisation_id query int false "Organisation ID to filter by"
// @Success 200 {array} LicenseCountResponse
// @Router /licenses [get]
func ListAllLicenses(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := c.Query("organisation_id")
		var licenses []LicenseCountResponse

		query := db.Table("components").
			Select("COALESCE(NULLIF(components.license, ''), 'Unknown') as name, count(*) as count").
			Group("COALESCE(NULLIF(components.license, ''), 'Unknown')").
			Order("count DESC")

		if orgID != "" {
			query = query.Joins("JOIN sboms ON sboms.id = components.sbom_id").
				Joins("JOIN repositories ON repositories.id = sboms.repository_id").
				Joins("JOIN products ON products.id = repositories.product_id").
				Where("products.organisation_id = ?", orgID)
		}

		query.Scan(&licenses)

		c.JSON(http.StatusOK, licenses)
	}
}

// GetLicenseDetails returns details of components using a specific license
// @Summary Get license details
// @Description Get a list of components across all repositories that use a specific license.
// @Tags compliance
// @Produce json
// @Param name path string true "License Name (use 'Unknown' for empty licenses)"
// @Param organisation_id query int false "Organisation ID to filter by"
// @Success 200 {array} LicenseUsageResponse
// @Router /licenses/{name} [get]
func GetLicenseDetails(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		licenseName := c.Param("name")
		orgID := c.Query("organisation_id")
		if licenseName == "Unknown" {
			licenseName = ""
		}

		var usage []LicenseUsageResponse

		query := db.Table("components").
			Select("organisations.name as organisation_name, products.name as product_name, repositories.name as repository_name, components.name as component_name, components.version, components.purl").
			Joins("JOIN sboms ON sboms.id = components.sbom_id").
			Joins("JOIN repositories ON repositories.id = sboms.repository_id").
			Joins("JOIN products ON products.id = repositories.product_id").
			Joins("JOIN organisations ON organisations.id = products.organisation_id").
			Where("components.license = ?", licenseName).
			Where("sboms.id IN (SELECT DISTINCT ON (repository_id) id FROM sboms ORDER BY repository_id, created_at DESC)")

		if orgID != "" {
			query = query.Where("products.organisation_id = ?", orgID)
		}

		query.Scan(&usage)

		c.JSON(http.StatusOK, usage)
	}
}
