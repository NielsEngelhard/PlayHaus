package main

import (
	"log"
	"net/http"
	app_user "playhausapi/internal/app_user/handlers"
)

func main() {
	mux := http.NewServeMux()

	// User
	mux.HandleFunc("GET /api/v1/users", app_user.CreateUserHandler)
	mux.HandleFunc("POST /api/v1/user", app_user.CreateUserHandler)
	mux.HandleFunc("PUT /api/v1/user/username", app_user.UpdateUsernameHandler)

	log.Fatal(http.ListenAndServe(":8080", mux))
}
