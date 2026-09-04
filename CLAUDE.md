# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

Two independent modules under `src/`, with no workspace tooling joining them. Run each from its
own directory.

- **`src/playhaus-api`** — Go 1.26, module `playhaus-api`. Stdlib `net/http` + GORM/SQLite.
- **`src/playhaus-app`** — Expo SDK 57 / React Native 0.86 / React 19, expo-router.

The app reaches the API through `EXPO_PUBLIC_API_URL` (`src/playhaus-app/.env`, default
`http://localhost:8080`), so start the API first.

There is no Makefile and no scripts directory; the commands below are the whole local build
surface. Deployment is separate and lives in `deployment/` — see **Deployment** at the bottom
of this file.

A nested `src/playhaus-app/CLAUDE.md` (→ `AGENTS.md`) also loads when working inside the app.

## Commands

### API — `cd src/playhaus-api`

```
go run ./cmd/api                 # run
go build -o ph-api ./cmd/api     # build (the binary name .gitignore expects)
go vet ./...
go test ./...                    # everything
go test ./internal/lol           # one package
go test ./internal/api -run TestLogoutRevokesOnlyThatToken -v   # one test
```

VS Code has a "Debug API" launch config at the repo root. Note it sets `PORT=8080`, which
`internal/config/config.go` does **not** read — the port comes from `ADDR`.

### App — `cd src/playhaus-app`

```
npm install
npm start          # expo start
npm run web        # expo start --web
npm run android    # expo run:android
npm run ios        # expo run:ios
npm run lint       # expo lint
npx tsc --noEmit   # typecheck — see caveat below
npm run mobiledev  # EAS iOS development build
```

**There are no app tests** — no jest, no vitest, no `test` script. Do not invent `npm test`.
Lint and TypeScript are the only gates on that side.

`npx tsc --noEmit` does not currently come back clean, and most of the noise is not real. The
typed-route union lives in `.expo/types`, which only `expo start` regenerates, so on a cold
checkout every `router.push('/games/quizzer/one-device')` is reported as not assignable. Run the
dev server once before trusting those. A handful of genuine errors do sit underneath
(`ImageSource | undefined` in the game index pages, an implicit `any` in `ScanToJoin`) — they
predate this file, so treat a *new* error as yours and an existing one as inherited.

## API architecture

**Startup** (`cmd/api/main.go` → `run() error`): `config.Load` → slog JSON logger →
`database.Open` → `database.Migrate` over `user.User`, `auth.Session` and each game's
`Models()` → `pubquizr.Seed` → services → `realtime.NewHub` → `api.NewServer(...)` →
`http.Server`. On shutdown `hub.Close()` runs **before** `srv.Shutdown` — `Shutdown` neither
closes nor waits for hijacked websocket connections.

**Config** (`internal/config/config.go`) — `ADDR` (`:8080`), `DB_PATH` (`data/app.db`, resolved
to an absolute path), `SHUTDOWN_TIMEOUT` (`10s`; an unparseable value is a hard startup
failure), `DEBUG`, `ALLOWED_ORIGINS` (comma list; an explicit empty string means no origins and
disables CORS), `LOL_DEV_MODE` (**defaults true** — every League of Letters round plays the
same word).

**Database** (`internal/platform/database`) — SQLite via `glebarez/sqlite` (pure Go, no cgo),
WAL + `foreign_keys` + `busy_timeout`, and `SetMaxOpenConns(1)` on purpose. Schema is GORM
`AutoMigrate` only: no migration files, no versioning. The package never imports domain types;
models are passed in from `main` and from tests. Every model declares `TableName()` with a game
prefix (`solo_lol_games`, `mp_lol_lobbies`, `pq_quizzes`, `oou_single_device_games`).

**Per-package layering**, identical across `lol`, `pubquizr`, `oneofus`, `user`, `auth`:

- `<pkg>.go` — GORM models, status enums, sentinel errors, `func Models() []any`
- `rules.go` — pure functions: no ctx, no store, no clock. Easiest thing to test, so most
  logic belongs here.
- `service.go` — declares the `Store` interface **next to its consumer**; `NewService(store, …)`;
  inputs are `XxxInput` with `validate() map[string]string`; the tri-value return
  `(*Model, map[string]string, error)` keeps "invalid input" apart from "broken".
- `store.go` — `GormStore` + `NewGormStore(db)` + `var _ Store = (*GormStore)(nil)`;
  `withXxx(db)` preload helpers; `gorm.ErrRecordNotFound` is translated to a package sentinel at
  the store boundary. Handlers never touch GORM.

**Routing** (`internal/api/server.go`) — stdlib `http.ServeMux` with Go 1.22 method+wildcard
patterns; no router library. Registration is grouped into `AddAuthHandlers()`,
`AddLeagueOfLettersHandlers()`, … methods on `*Server`, all under `/api/v1/`. Literal segments
(`/lobby/current`) must be registered before `{code}` so the literal wins. Middleware is
`chain(s.mux, requestID, recoverPanic(log), logRequests(log), cors(origins))` — CORS sits
innermost so a preflight still gets a request id and a log line. `logRequests`' `statusRecorder`
forwards `Unwrap()`, `Hijack()` and `Flush()` so websocket upgrades survive the wrapper.

**Auth** — opaque, revocable, server-side bearer sessions; deliberately **not JWT**. The token
is 32 random bytes base64url and the DB stores only its SHA-256; `SessionTTL` is 7 days. Routes
are guarded individually with `s.requireAuth`, and handlers read the caller with
`UserIDFrom(ctx)` — never from the request body. `s.requireGameCode(joincode.X, next)` checks a
`{code}` path value belongs to that game (404, not 400, for another game's code); the two
compose into a local `room := func(next http.HandlerFunc) http.HandlerFunc`. Guest users are
first-class: `POST /api/v1/user/guest` creates one with a session, `/user/upgrade` converts it
in place keeping the same row id. Sockets bypass `requireAuth` and authenticate themselves from
the header or `?token=`.

**Responses** (`internal/api/respond.go`) — `writeJSON`, `writeError` → `{"error": …}`,
`writeErrorCode` → adds a stable `code` the app branches on. Request bodies go through the
generic `decode[T Validator]` with `DisallowUnknownFields`; `Validate() map[string]string`
produces the 422 `{"errors": {field: problem}}` shape. `timeFormat = time.RFC3339` is the one
wire format for timestamps. Handler errors are an `errors.Is` switch ending in log + 500.

**Join codes** (`internal/joincode`) — five characters: the first names the game (`L`/`P`/`O`),
four drawn with `crypto/rand` from a 32-character ambiguity-free alphabet (no I/1/O/0).
`Normalize` folds a leading `0`→`O` and `1`→`L`, **only in position 0**. The code is the lobby's
primary key, so normalisation is load-bearing under SQLite's byte-wise text comparison.
`Game.Namespace()` derives the realtime namespace, so key and code cannot disagree.

**Realtime** (`internal/realtime`, on `coder/websocket`) — a game-agnostic `Hub` of rooms keyed
`Key{Namespace, ID}`. A game owns a namespace by implementing `Handler`
(`OnJoin`/`OnMessage`/`OnLeave`). All three run on the room's single goroutine, so the room needs
no locking — and nothing in them may block. HTTP handlers do the write and then publish with
`s.rt.In(key, func(*Room){…})`; they never read game state out of the hub. Only League of
Letters registers a handler today (`internal/api/lol_realtime.go`, which lives in `api` so that a
lobby on a socket frame and a lobby in a response body are the same lobby). Clients send exactly
one message type — `typing`; everything else goes over HTTP.

**Content** — three separate `//go:embed data` trees, one per owning package:
`internal/lol/words.go` (`data/{loc}/{loc}-{size}-{all|common}.txt`),
`internal/oneofus/content.go`, and `internal/pubquizr/seed.go`
(`data/{loc}/{official|weekly}/{slug}.json`, where locale and category come from the directory
rather than a field, so a file can never disagree with where it is filed). Locales are `nl`
(**the default**) and `en` via `internal/i18n`; `Locale` implements `driver.Valuer`/`sql.Scanner`
and refuses to store an unsupported value.

`internal/lol/data/README.md` is **stale** — it documents an older `-allowed.txt` naming that no
longer matches `words.go` or the files on disk.

**Tests** — 43 files, stdlib only: no mocks, no fakes, no assertion library. Everything runs
against a real SQLite file in `t.TempDir()`; the helpers are `newTestServer(t)` /
`newTestServerWithDB(t)` in `internal/api/api_test.go` and `newTestStore(t)` in
`internal/lol/store_test.go`. Both close the `*sql.DB` in `t.Cleanup` — Windows will not delete
the temp dir while the file is open. HTTP tests go through the full middleware chain via
`httptest` (`do`, `post`, `decodeBody[T]`, `newGuestSession`). No `t.Parallel()` anywhere, since
SQLite has one writer. Names are sentence-like and behavioural
(`TestCurrentLobbyIsTheHostsOnly`), not `TestFunc_Case`. Files in `internal/api` are named by
feature with a game prefix: `mp_lol_*`, `solo_lol_*`, `pq_*`, `oou_*`.

## App architecture

**Routing** — expo-router with `typedRoutes` and `reactCompiler` on. There is exactly one
layout, `src/app/_layout.tsx`, and **no route groups**; the root renders a bare `<Slot />` inside
`SafeAreaProvider → ThemeProvider → NavigationThemeProvider → AuthProvider → LanguageProvider →
MusicProvider → FullScreenProvider → PageToneProvider → Chrome + AuthGate`. `Chrome()` is the
page frame (one `ScrollView`, `Header`, `SlideFadeIn`, `BottomBar`), and the direction of the page
transition comes from route depth, not history. Pages claim layout modes through context —
`useFullScreen()`, `useChromeless()`, `usePageTone(tone)` — rather than through a navigator.
Hrefs live in `src/constants/routes.ts` (`ROUTES`); use those, not string literals.

**`src/features/<x>/` vs `src/components/`** — `components/{layout,text,ui}` is the game-agnostic
kit (`PageBase`, `AppText`, `Card`, `ActionButton`, `HandoffScreen`, …). Anything that knows a
specific game or domain is a feature: its hooks (`useGame.ts`, `useQuizSession.tsx` — `.tsx` when
the hook ships a provider), its pure domain modules (`hot-seat.ts`, `flow.ts`, `round-three.ts`),
its `*-errors.ts`, and a `components/` subfolder. Pages under `src/app/` stay thin.

**Error mappers return a `TranslationKey`, never a finished sentence.** They are stored in state,
and a sentence would be frozen in whichever language was current when the call failed. They
branch on `error instanceof ApiError` plus `status`, falling back to a `…errors.network` key
because `fetch` rejects with a `TypeError` when the host is unreachable.

**Platform splits** — `foo.ts` / `foo.web.ts` (`token-store`, `theme-store`, `table-store`,
`music-player`, `device-language`, `use-color-scheme`, `haptics`, `share`). Two rules:

- A `.web.ts` fork must **never import its own module path** — Metro resolves it back to itself.
  Shared parsing goes in a third file (see `one-device-table.ts`).
- Every web fork must survive running in Node with no `window`: `app.json` sets
  `web.output: "static"`, so the site is pre-rendered.

**One-device play** — `src/constants/games.ts` has
`DeviceMode = 'perPlayer' | 'oneDevice' | 'perPlayerOrOneDevice'`. League of Letters is
`perPlayer` (lobby + socket); PubquizR and One of Us are one phone passed round the table, so
there is no lobby, no socket and no per-player identity, and every write replaces local state
with the server's answer. `src/features/table/one-device-table.ts` holds the shared validation
and returns a `TableProblem` **tag, not copy**; each game's own `one-device-table.ts` turns the
tag into that game's translation keys.

**API layer** — `src/api/client.ts` exports `request<T>`, `ApiError`, `apiErrorCode`, and a
`setTokenGetter` seam so the client never imports auth. The body is read as text and then parsed
defensively: a proxy's HTML 502 would make `res.json()` throw on exactly the responses whose
message matters most. Endpoint wrappers live in `src/api/calls/*.ts` and mirror the Go DTOs —
keep the two in step. `src/api/socket.ts` is a raw `WebSocket` with jittered reconnect, wrapped
for React by `useRoomSocket`.

**Theming** — there is no NativeWind and no Tailwind. `src/global.css` is web-only CSS (font
stacks and one scrollbar), imported once from `src/constants/theme.ts`. Components must not read
scheme-dependent colours at module scope: `StyleSheet.create` copies its values, so a sheet built
at import time is frozen at whichever scheme was current. Use
`createThemedStyles(theme => ({…}))`, which returns a `useStyles()` hook conventionally declared
at the bottom of the file. Only `Brand` in `constants/theme.ts` is scheme-invariant and safe at
module scope. Reach for `useTheme()` only when a colour is needed as a *value* (an icon's `color`
prop). `AccentProvider`/`useAccent()` is a per-screen colour identity and deliberately not part of
`Theme`. `style` props are layout-only by convention — the look lives in the sheet.

**i18n** — `react-i18next`, catalogs in `src/features/i18n/locales/{en,nl}.ts`, typed keys.

**Aliases** — `@/*` → `./src/*`, `@/assets/*` → `./assets/*`.

**Expo version discipline** — Expo has changed a lot. Read the exact versioned docs at
<https://docs.expo.dev/versions/v57.0.0/> before writing Expo code.

## House style

The codebase is unusually heavily commented, in prose, explaining *why* — often several
sentences, with package docs on anything non-obvious. Match that register rather than the sparse
default. No Prettier: the app uses 4-space indent and single quotes. The app's
`.vscode/settings.json` runs `organizeImports` and `sortMembers` on save, which is why import
blocks and interface members are alphabetised.

## Product docs

- `src/playhaus-app/PubquizrConcept.md` — the authoritative spec for PubquizR: 5 rounds, 3–8
  players, single-device only, and the hot-seat rule (answer correctly and you stay; the
  quizmaster role only moves when a question goes all the way round unanswered; only every second
  question scores). It maps onto `features/pubquizr/hot-seat.ts` and `round-three.ts`…`round-six.ts`.
- `src/playhaus-app/IDEAS.md` — an unimplemented backlog of game concepts.
- `src/playhaus-app/README.md` — untouched create-expo-app boilerplate describing an `app/`
  directory this repo does not have. Ignore it.

## Deployment

Everything about running this in production is under `deployment/`, and
`deployment/README.md` is the runbook — read that rather than reconstructing it from here.

One $6/month DigitalOcean droplet, three containers: `caddy` (TLS and Let's Encrypt) in
front of `app` (the nginx image, which serves the static Expo export **and** proxies
`/api/` onward) in front of `api`. The app and the API therefore share one origin, which is
why `ALLOWED_ORIGINS` is set to the empty string in production and why the websocket's
`Origin`-versus-`Host` check passes without configuration.

- `deployment/terraform/` — droplet, firewall, reserved IP, and a `cloud-init.yaml.tftpl`
  that runs **only on first boot**. The droplet carries
  `lifecycle { ignore_changes = [user_data, image] }` so that editing the template cannot
  replace the box; its disk is the entire database.
- `deployment/server/` — the compose file, `Caddyfile` and `deploy.sh` that live on the
  droplet. Copied up by CI on every deploy, so the repo is the only definition of them.
- `deployment/docker-compose.yml` — the *local* stack, which builds from source. Not what
  production runs.
- `.github/workflows/deploy-{api,app}.yml` — build, push to GHCR tagged `sha-<12>`, and
  recreate **only** that one container (`--no-deps`). A backend deploy never reloads a
  player's open page. Both are `workflow_dispatch` only: **nothing deploys on a push to
  `main`**, so do not describe merging as shipping.

Two things worth knowing before changing anything here:

- `EXPO_PUBLIC_API_URL` is inlined by Metro at **image build time**, so the web image is
  domain-specific and changing the domain means rebuilding it — not just editing an
  environment variable.
- `GET /api/v1/health` (`internal/api/health.go`) is the only route with no token in front
  of it. It deliberately touches no storage: it answers the container healthcheck, and a
  probe that queried SQLite would fail behind a write and restart a healthy server. The
  deploy workflows do **not** check it — they ship and stop, so a green run does not mean
  the container serves.

There are **no backups** — a deliberate choice. The SQLite file has exactly one copy, on
the droplet's disk.
