# Changes for e.g. Update username endpoint and responsibilities per file 

cmd/api/main.go
internal/
  user/
    model.go       // User struct
    errors.go      // ErrUsernameTaken, ErrInvalidUsername
    service.go     // UpdateUsername — the rules
    handler.go     // UpdateUsername — the HTTP
    routes.go      // PUT /users/me/username → handler
  httpx/
    json.go        // shared decode/encode helpers