package database

import (
	models "playhausapi/internal/app_user"

	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.AppUser{},
		// add each new model here
	)
}
