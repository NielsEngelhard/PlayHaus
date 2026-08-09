package database

import (
	models "playhausapi/internal/app_user"
	"playhausapi/internal/auth"
	leagueofletters "playhausapi/internal/league_of_letters"

	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.AppUser{},
		&auth.Session{},
		&leagueofletters.Game{},
		&leagueofletters.Player{},
		&leagueofletters.Round{},
		&leagueofletters.Guess{},
		// add each new model here
	)
}
