package main

import (
	"log"
	"net/http"
	app_user "playhausapi/internal/app_user"
	"playhausapi/internal/database"

	"gorm.io/gorm"
)

func main() {
	mux := http.NewServeMux()
	db, err := initDatabase()
	if err != nil {
		log.Fatalf("Error initializing the database %v", err)
	}

	// Handlers
	addUserHandlers(mux, app_user.New(db))

	// Database
	initDatabase()

	log.Fatal(http.ListenAndServe(":8080", mux))
}

func addUserHandlers(mux *http.ServeMux, h *app_user.Handler) {
	mux.HandleFunc("GET /api/v1/users", h.GetUsersHandler)
	mux.HandleFunc("POST /api/v1/user", h.CreateUserHandler)
	mux.HandleFunc("PUT /api/v1/user/username", h.UpdateUsernameHandler)
}

func initDatabase() (*gorm.DB, error) {
	db, err := database.Open("playhaus.db")
	if err != nil {
		log.Fatalf("open db: %v", err)
		return nil, err
	}
	if err := database.Migrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
		return nil, err
	}

	return db, nil
}
