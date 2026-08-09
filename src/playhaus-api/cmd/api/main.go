package main

import (
	"log"
	"net/http"
	"os"

	app_user "playhausapi/internal/app_user"
	"playhausapi/internal/auth"
	"playhausapi/internal/database"
	leagueofletters "playhausapi/internal/league_of_letters"

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
	addLeagueOfLettersHandlers(mux, leagueofletters.New(db), authHandler)

	log.Printf("listening on %s", listenAddr())
	log.Fatal(http.ListenAndServe(listenAddr(), withCORS(mux)))
}

func listenAddr() string {
	if port := os.Getenv("PORT"); port != "" {
		return ":" + port
	}
	return ":8080"
}

func addAuthHandlers(mux *http.ServeMux, h *auth.Handler) {
	mux.HandleFunc("POST /api/v1/login", h.Login)
	mux.HandleFunc("POST /api/v1/guest", h.Guest)
	mux.HandleFunc("POST /api/v1/logout", h.Logout)

	mux.HandleFunc("GET /api/v1/me", h.RequireAuth(h.Me))
}

func addUserHandlers(mux *http.ServeMux, h *app_user.Handler, a *auth.Handler) {
	// Public: signup is how you get an account in the first place.
	mux.HandleFunc("POST /api/v1/user", h.CreateUserHandler)

	// Authenticated.
	mux.HandleFunc("GET /api/v1/users", a.RequireAuth(h.GetUsersHandler))

	// Sits beside `GET /api/v1/me`, which the auth handler owns: same resource,
	// read there and written here.
	mux.HandleFunc("PUT /api/v1/me", a.RequireAuth(h.UpdateProfileHandler))
}

func addLeagueOfLettersHandlers(mux *http.ServeMux, h *leagueofletters.Handler, a *auth.Handler) {
	mux.HandleFunc("POST /api/v1/league-of-letters/games", a.RequireAuth(h.CreateGameHandler))
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
