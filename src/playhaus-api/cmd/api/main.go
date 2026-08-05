package main

import (
	"log"
	"log/slog"
	"net/http"
	"os"

	"playhaus-api/internal/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	srv := server.New(logger)

	const addr = ":8080"
	logger.Info("listening", "addr", addr)
	log.Fatal(http.ListenAndServe(addr, srv.Handler()))
}
