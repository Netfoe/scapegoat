package database

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"github.com/netfoe/scapegoat/backend/internal/models"
)

func InitDB(url string, migrate bool) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(url), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if migrate {
		// Auto-migrate models
		err = db.AutoMigrate(
			&models.Organisation{},
			&models.Product{},
			&models.Policy{},
			&models.Repository{},
			&models.SBOM{},
			&models.Component{},
			&models.Vulnerability{},
		)
		if err != nil {
			return nil, err
		}
	}

	return db, nil
}
