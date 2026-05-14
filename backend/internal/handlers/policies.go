package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/netfoe/scapegoat/backend/internal/models"
	"gorm.io/gorm"
)

// CreatePolicy creates a new policy
// @Summary Create a new policy
// @Description Create a new compliance policy for an organisation
// @Tags policies
// @Accept json
// @Produce json
// @Param policy body CreatePolicyInput true "Policy object"
// @Success 201 {object} models.Policy
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /policies [post]
func CreatePolicy(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input CreatePolicyInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		policy := models.Policy{
			OrganisationID:     input.OrganisationID,
			Name:               input.Name,
			AllowedLicenses:    input.AllowedLicenses,
			DisallowedLicenses: input.DisallowedLicenses,
			DisallowedDeps:     input.DisallowedDeps,
		}

		if err := db.Create(&policy).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create policy"})
			return
		}

		c.JSON(http.StatusCreated, policy)
	}
}

// ListPolicies returns a list of policies
// @Summary List policies
// @Description Get a list of policies, optionally filtered by organisation
// @Tags policies
// @Produce json
// @Param organisation_id query int false "Organisation ID to filter by"
// @Success 200 {array} models.Policy
// @Router /policies [get]
func ListPolicies(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := c.Query("organisation_id")
		var policies []models.Policy
		query := db
		if orgID != "" {
			query = query.Where("organisation_id = ?", orgID)
		}
		query.Find(&policies)
		c.JSON(http.StatusOK, policies)
	}
}

// UpdateProductPolicy updates the policy associated with a product
// @Summary Update product policy
// @Description Assign or update a compliance policy for a specific product
// @Tags products
// @Accept json
// @Produce json
// @Param id path int true "Product ID"
// @Param policy body UpdateProductPolicyInput true "Policy ID wrapper"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /products/{id}/policy [put]
func UpdateProductPolicy(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID := c.Param("id")
		var input UpdateProductPolicyInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.Model(&models.Product{}).Where("id = ?", productID).Update("policy_id", input.PolicyID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product policy"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Product policy updated successfully"})
	}
}
