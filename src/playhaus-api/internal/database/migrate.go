package database

import (
	models "playhausapi/internal/app_user"
	"playhausapi/internal/auth"

	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.AppUser{},
		&auth.Session{},
		// add each new model here
	)
}
