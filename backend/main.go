package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/netfoe/scapegoat/backend/internal/database"
	"github.com/netfoe/scapegoat/backend/internal/handlers"
	"github.com/netfoe/scapegoat/backend/internal/queue"
	"github.com/netfoe/scapegoat/backend/internal/worker"
	"github.com/netfoe/scapegoat/backend/internal/auth"

	_ "github.com/netfoe/scapegoat/backend/docs"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Scapegoat API
// @version 1.0
// @description This is the Scapegoat SBOM and Vulnerability Management API.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api/v1
func main() {
	mode := flag.String("mode", "api", "Mode to run the application (api or worker)")
	flag.Parse()

	ctx := context.Background()

	// Initialize database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://scapegoat:scapegoat_password@localhost:5432/scapegoat?sslmode=disable"
	}

	db, err := database.InitDB(dbURL, *mode == "api")
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize Redis Queue
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}
	qClient := queue.NewClient(redisURL)

	if *mode == "worker" {
		w := worker.NewWorker(db, qClient)
		w.Start(ctx)
		return
	}

	// Initialize Auth
	authenticator, err := auth.InitAuth(ctx)
	if err != nil {
		log.Printf("Warning: Failed to initialize Zitadel auth: %v. API will not be protected properly.", err)
	}

	// API Mode
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API V1 Group
	v1 := r.Group("/api/v1")
	if authenticator != nil {
		v1.Use(auth.Middleware(authenticator))
	}

	// SBOM Routes
	v1.POST("/sboms/upload", handlers.UploadSBOM(db))
	v1.GET("/sboms/:id", handlers.GetSBOM(db))

	// Hierarchy Routes
	v1.POST("/organisations", handlers.CreateOrganisation(db))
	v1.GET("/organisations", handlers.ListOrganisations(db))
	v1.PUT("/organisations/:id", handlers.UpdateOrganisation(db))
	v1.DELETE("/organisations/:id", handlers.DeleteOrganisation(db))
	
	v1.POST("/products", handlers.CreateProduct(db))
	v1.GET("/products", handlers.ListProducts(db))
	v1.PUT("/products/:id/policy", handlers.UpdateProductPolicy(db))
	
	v1.POST("/policies", handlers.CreatePolicy(db))
	v1.GET("/policies", handlers.ListPolicies(db))
	v1.GET("/policies/:id", handlers.GetPolicyDetails(db))
	
	v1.GET("/licenses", handlers.ListAllLicenses(db))
	v1.GET("/licenses/:name", handlers.GetLicenseDetails(db))
	
	v1.POST("/repositories", handlers.CreateRepository(db, qClient))
	v1.GET("/repositories", handlers.ListRepositories(db))
	v1.GET("/repositories/:id", handlers.GetRepository(db))
	v1.POST("/repositories/:id/scan", handlers.TriggerScan(db, qClient))
	v1.GET("/repositories/:id/scans", handlers.ListRepositoryScans(db))
	v1.GET("/repositories/:id/sbom", handlers.GetRepositorySBOM(db))

	// Dashboard Routes
	v1.GET("/dashboard/stats", handlers.GetDashboardStats(db))

	// Search Routes
	v1.GET("/search/dependencies", handlers.SearchDependencies(db))

	// GitHub Routes
	v1.GET("/github/orgs/:org/repos", handlers.FetchGitHubRepos())
	v1.POST("/github/import", handlers.ImportGitHubRepos(db, qClient))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}
