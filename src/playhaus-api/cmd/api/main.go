package main

import (
	"log"
	"net/http"
	app_user "playhausapi/internal/app_user"
	"playhausapi/internal/auth"
	"playhausapi/internal/database"

	"gorm.io/gorm"
)

func main() {
	mux := http.NewServeMux()
	db, err := initDatabase()
	if err != nil {
		log.Fatalf("Error initializing the database %v", err)
	}

	authHandler := auth.New(db)

	// Handlers
	addUserHandlers(mux, app_user.New(db), authHandler)
	addAuthHandlers(mux, authHandler)

	log.Fatal(http.ListenAndServe(":8080", mux))
}

func addAuthHandlers(mux *http.ServeMux, h *auth.Handler) {
	mux.HandleFunc("POST /api/v1/login", h.Login)
	mux.HandleFunc("POST /api/v1/logout", h.Logout)
}

func addUserHandlers(mux *http.ServeMux, h *app_user.Handler, a *auth.Handler) {
	// Public: signup is how you get an account in the first place.
	mux.HandleFunc("POST /api/v1/user", h.CreateUserHandler)

	// Authenticated.
	mux.HandleFunc("GET /api/v1/users", a.RequireAuth(h.GetUsersHandler))
	mux.HandleFunc("PUT /api/v1/user/username", a.RequireAuth(h.UpdateUsernameHandler))
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
