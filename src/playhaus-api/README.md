# playhaus-api

The Go backend for PlayHaus. HTTP + JSON over SQLite, no external services.

## Running

```sh
go run ./cmd/api      # build + run on :8080
go build ./cmd/api    # writes api.exe
go test ./...
gofmt -l .            # should print nothing
golangci-lint run     # needs golangci-lint v2
```

Dependencies come down with `go mod download`; there is no separate install step.

## Configuration

Every setting has a development default, so the command above works with no
environment set up. The defaults are the *insecure* ones — production has to say
so and gets checked.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | Listen port. |
| `DATABASE_PATH` | `playhaus.db` | SQLite file. Its directory must exist. |
| `SECURE_COOKIES` | `false` | Marks session cookies HTTPS-only. Must be `true` in production. |
| `ALLOWED_ORIGINS` | *(empty)* | Comma-separated CORS allowlist. Empty reflects any origin, which is for local development only. |
| `APP_ENV` | *(empty)* | Set to `production` to enforce the two settings above and switch logging to JSON. |

## Layout

```
cmd/api/          main, routes, CORS — wiring only
internal/
  config/         every environment-dependent setting
  database/       SQLite connection pools (read + write)
  migrate/        the schema; imports every model package
  httpjson/       request decoding and the JSON response/error envelopes
  password/       bcrypt hashing
  authctx/        the authenticated user ID on a request context
  auth/           sessions: login, guest, logout, RequireAuth
  user/           accounts and profiles
  leagueofletters/  the game
```

### How a feature package is organised

Packages are split **by layer, not by endpoint**. Files inside a Go package
share one namespace, so a file per handler would separate nothing — the
encapsulation boundary is the package. `leagueofletters` is the fullest example:

| File | Holds | May reach |
| --- | --- | --- |
| `handlers.go` | HTTP: decode, delegate, map errors to statuses | the service |
| `service.go` | the rules — what a legal game and a legal guess are | the store |
| `store.go` | every SQL statement in the package | the database |
| `dto.go` | wire shapes and the pure functions that build them | nothing |
| `models.go` | the rows as they exist in the database | — |
| `scoring.go` | marking and scoring — pure, heavily tested | — |

`store.go` is the only file in the package that imports GORM, and the only one
that knows what a table is called.

## Testing

- `cmd/api/api_test.go` drives the real router over the real store against a
  SQLite file in a temp directory. Nothing is mocked — it covers routing, auth,
  the transaction in the guess path, and what does and does not appear in a
  response body.
- `internal/migrate` asserts the schema actually carries the foreign keys and
  unique indexes the code relies on, and that the read pool refuses writes.
- The pure layers (`scoring.go`, `dto.go`, `user/validate.go`) are tested
  directly, table-driven.

## Known gaps

- **Multiplayer is half-built.** A multiplayer game can be created and gets a
  room code, but there is no join and no start endpoint, so nothing sets
  `Game.EndsAt` and no multiplayer game can be played. `GameDuration` is unused
  for the same reason.
- **`Game.Version` is written and never read.** The intended protocol — the
  client polls with the version it last saw and gets told "nothing changed" —
  has no server half yet.
- **Word lists are ten-word placeholders**, so guesses are checked for shape
  only, not against a dictionary.
- **`AutoMigrate` is the migration strategy.** It adds tables, columns and
  indexes but never drops or renames one and cannot move data. Replace it with
  versioned migrations before the database holds anything worth keeping.
  Foreign keys are only emitted when a table is first created — SQLite cannot
  `ALTER TABLE ADD CONSTRAINT` — so a database created before the relations were
  declared keeps its unconstrained columns until it is recreated.
- **Everyone in a round sees everyone's guesses and marks.** Correct for a
  shared board; wrong if players are meant to race independently.
