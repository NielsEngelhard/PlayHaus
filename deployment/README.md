# Deploying PlayHaus

The site is one $6/month DigitalOcean droplet in Amsterdam running three containers:

```
:80/:443  ->  caddy      TLS, Let's Encrypt, www -> apex
                |
                v
              app        nginx: the static Expo export, and /api/ proxied onward
                |
                v
              api        the Go binary
                |
                v
              Postgres   external, reached through DATABASE_URL; not on the droplet
```

Only Caddy is reachable from outside. The app and API answer on **one origin**, which is
why there is no CORS configuration to get wrong and why the websocket's `Origin` check
passes without being told anything: `src/playhaus-app/nginx.conf` has always done that
routing, and Caddy was added in front of it rather than instead of it.

| Where | What |
| --- | --- |
| `terraform/` | the droplet, its firewall, its reserved IP |
| `server/` | what runs on the droplet — copied up by CI on every deploy |
| `docker-compose.yml` | the **local** stack, which builds from source. Not used in production |
| `../.github/workflows/` | build, publish to GHCR, roll one container |

---

## First-time setup

Nine steps, once. Roughly half an hour, most of it waiting for DNS.

### 1. An SSH key for CI

Kept separate from your own key so that revoking the pipeline's access never means
rotating yours.

```powershell
ssh-keygen -t ed25519 -C "playhaus-ci" -f "$env:USERPROFILE\.ssh\playhaus_ci"
```

Leave the passphrase empty — an automated deploy has nobody to type one.

Spell the path out rather than writing `~/.ssh/playhaus_ci`. PowerShell passes the tilde
through untouched and Windows `ssh-keygen` does not expand it, so the shorter form fails
with `No such file or directory` while appearing to be about a missing `.ssh` directory.
In Git Bash the `~` form is fine.

### 2. A DigitalOcean token

<https://cloud.digitalocean.com/account/api/tokens> → Generate New Token, **read and
write**. It is shown once.

### 3. Fill in the variables

```
cd deployment/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit it: the token, your `acme_email`, and the two public keys verbatim.

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"    # admin_ssh_public_key
Get-Content "$env:USERPROFILE\.ssh\playhaus_ci.pub"   # ci_ssh_public_key
```

`terraform.tfvars` is gitignored.

### 4. Create the infrastructure

```
terraform init
terraform apply
```

Two or three minutes. Keep the outputs; `terraform output` prints them again.

**`terraform.tfstate` is the only record that any of this exists.** It is a local file and
it is gitignored. Copy it somewhere safe.

### 5. DNS

`terraform output dns_records` prints exactly what to create at your registrar:

```
A   @     <reserved ip>   TTL 300
A   www   <reserved ip>   TTL 300
```

Then wait, and check:

```powershell
Resolve-DnsName playhaus.site -Type A | Select-Object Name, IPAddress
```

(`dig` is not on Windows. In Git Bash, `nslookup playhaus.site` does the same job.)

**Do not deploy until that returns the reserved IP.** Caddy asks Let's Encrypt for a
certificate the moment it starts, Let's Encrypt validates by connecting to whatever the
name resolves to, and it rate-limits failures — five certificates per domain per week. A
handful of impatient restarts can leave the site without TLS for days.

### 6. GitHub secrets and variables

Settings → Secrets and variables → Actions.

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DEPLOY_HOST` | the reserved IP |
| Secret | `DEPLOY_SSH_KEY` | the **private** key — the whole file, `BEGIN`/`END` lines included (see below) |
| Secret | `DATABASE_URL` | the Postgres connection string, e.g. `postgres://user:pass@host:25060/playhausdb?sslmode=require` |
| Variable | `PUBLIC_ORIGIN` | `https://playhaus.site` |

`DATABASE_URL` is written into `/opt/playhaus/.env` (mode 600) on every API deploy, sent
over ssh's stdin so it never appears in a log or in `ps`. So rotating the password means
updating the secret and re-running **Deploy API**. Three things to get right about the
database itself:

- **Let the droplet in.** A managed Postgres refuses connections by default. Add the
  droplet (or its reserved IP) to the database's trusted sources.
- **`sslmode=require`**, or stricter. The connection leaves the droplet.
- **URL-encode the password** if it contains `@`, `:`, `/`, `?` or `#`. A single quote
  cannot be stored at all, and `set-env.sh` refuses it rather than mangling it.

The private key is the one **without** the `.pub`. Copy it to the clipboard whole, rather
than reading it off the screen and retyping it:

```powershell
Get-Content "$env:USERPROFILE\.ssh\playhaus_ci" -Raw | Set-Clipboard
```

`PUBLIC_ORIGIN` is a *variable*, not a secret: it is compiled into the web bundle and
served to every visitor, and a secret would be masked in the build logs for no benefit.

### 7. Deploy

Actions tab → **Deploy API** → Run workflow. Let it finish, then do the same for
**Deploy Web App**.

Order matters only this once: each workflow touches only its own container, so the second
run is what completes the set. Until the web app has been deployed, the site answers
**502** — Caddy is up and holding a valid certificate, but has nothing to proxy to. That
is expected, not a fault.

### 8. Make the packages public

The first push creates two **private** packages. The droplet pulls anonymously, so make
them public once:

GitHub → your profile → Packages → `playhaus-api` → Package settings → Change visibility →
Public. Repeat for `playhaus-app`.

(If you would rather keep them private, `deploy.sh` needs a `docker login ghcr.io` with a
read-only PAT stored on the droplet.)

### 9. Check it

```powershell
curl.exe https://playhaus.site/api/v1/health     # {"status":"ok"}
```

`curl.exe`, spelled out: in PowerShell bare `curl` is an alias for `Invoke-WebRequest`,
which takes none of the same flags. Real curl ships with Windows and is the one meant
everywhere in this file.

The first request can take half a minute while Caddy gets its certificate. Then open the
site, and start a **League of Letters** multiplayer lobby on two devices — that is the
only path that exercises `wss://` all the way through Caddy, nginx and the Go hijack.

---

## Deploying, after that

**Both workflows are manual.** Nothing deploys on a push to `main` — merging and shipping
are separate decisions, and the droplet is the live site.

Actions tab → **Deploy API** or **Deploy Web App** → Run workflow. Pick the half you
changed; run both if you changed both. Each builds from whatever commit is on the branch
you select in the Run workflow dialog, so you can also ship an older commit deliberately.

Each run builds, pushes `sha-<12 chars>` and `latest` to GHCR, recreates **only its own
container** with `--no-deps`, and then records the exact sha tag in `/opt/playhaus/.env`.
Shipping a backend fix does not reload anyone's open page.

**Deploy API migrates, and nothing else does.** Before the `api` container is touched,
`deploy.sh` runs `/app/ph-migrate` from the new image in a throwaway container. It
applies every pending migration in
`src/playhaus-api/internal/platform/database/migrations/`, then seeds the quizzes. A quiz
file that is new or has changed is written, and an unchanged one is skipped by its hash.
If either step fails the workflow goes red, and the old container is still serving. The
API never migrates by itself: it refuses to start while a migration is pending.

Both runs also copy the current `deployment/server/` files up to the droplet, so a change
to the compose file or the Caddyfile takes effect on the next deploy of either half —
whichever you happen to run.

**A deploy is not verified.** `docker compose up -d` returns as soon as the container has
been *created*, so a green run means the image was built, pushed, and recreated on the
droplet — not that it serves. A failed migration does stop the run, but a binary that
panics a minute after starting would not, and nothing here would notice.

So check by hand after shipping something you are unsure of:

```powershell
curl.exe https://playhaus.site/api/v1/health
ssh deploy@<ip> "cd /opt/playhaus && docker compose ps"
```

`docker compose ps` reports health for both `api` and `app`, since each declares a
healthcheck — that is the quickest read on whether the thing that just shipped is alive.

---

## Rolling back

The tag in `.env` is an exact commit, so going back is editing one line.

```
ssh deploy@<ip>
cd /opt/playhaus
cat .env                                    # what is running now
docker image ls | grep playhaus             # what is still on the box (last 7 days)

nano .env                                   # point API_IMAGE at the older sha- tag
docker compose pull api
docker compose up -d --no-deps api
```

Then re-run the workflow for the good commit so the repository and the box agree again.

**Rolling back the code does not roll back the schema.** Migrations have no down step in
this pipeline. The older image starts against the newer schema, and its `ph-migrate`
treats it as already up to date. That only works because a migration never removes what
the previous release still reads. Drop or rename a column in a release of its own, once
the code has stopped using it.

---

## Day to day

```
ssh deploy@<ip>
cd /opt/playhaus

docker compose ps                  # what is up, and whether api is healthy
docker compose logs -f api         # JSON slog, one line per request
docker compose logs -f caddy       # certificate trouble shows up here
docker compose logs -f app         # nginx access log

docker compose restart api
df -h /                            # 25 GB; the daily prune keeps images in check
free -m                            # 1 GB plus 2 GB of swap
```

### The database

An external Postgres, reached through `DATABASE_URL`. Nothing about it lives on the
droplet, so destroying the droplet no longer loses data. Backups are whatever its host
provides.

The schema is versioned goose SQL files in
`src/playhaus-api/internal/platform/database/migrations/`. The `goose_db_version` table
records which ones have been applied. A model change needs a new file there, and
`TestMigrationsMatchTheModels` fails until it has one. Never edit a file that has already
been deployed: goose will not run it again.

To see where production is, run this from the droplet:

```
docker compose run --rm --no-deps --entrypoint /app/ph-migrate api   # idempotent: applies nothing new, re-seeds nothing unchanged
```

### The site answers 502

Caddy is running and TLS is fine — it has simply got nothing to forward to. Check which
containers are actually up:

```
ssh deploy@<ip>
cd /opt/playhaus && docker compose ps
```

A 502 on **`/` as well as `/api/`** means the **app** container is missing or down: `/` is
served by nginx off its own disk with no upstream involved, so nothing but a missing app
container can produce it. Run **Deploy Web App**.

A 502 on `/api/` only, with `/` still serving the page, means the **api** container is
down. Run **Deploy API**, or look at `docker compose logs api`.

### Certificates

Caddy renews on its own, about 30 days before expiry. If something is wrong:

```
docker compose logs caddy | grep -i -E 'error|acme|certificate'
```

The usual causes are DNS not resolving to this droplet, or port 80 unreachable — Let's
Encrypt validates over HTTP even for an HTTPS certificate.

The certificates live in the `playhaus_caddy-data` volume. Do not delete it casually;
re-issuing counts against the weekly rate limit.

---

## Changing the domain

Three places, and the last one is the one people forget:

1. `domain` in `terraform.tfvars`, then `terraform apply` — this only affects the outputs.
2. `DOMAIN=` in `/opt/playhaus/.env` on the droplet, then
   `docker compose up -d --no-deps caddy`.
3. The `PUBLIC_ORIGIN` repository variable, **and then a rebuild of the web app**.
   `EXPO_PUBLIC_API_URL` is inlined into the bundle by Metro at build time; changing the
   variable without re-running Deploy Web App leaves every page calling the old host.

---

## Working locally

The compose file one level up builds both images from source and needs no droplet:

```
cd deployment
cp .env.example .env
docker compose up --build
```

Then <http://localhost:3000>. That stack brings its own Postgres (`db`) and runs
`ph-migrate` as a one-shot `migrate` service before `api` starts, the same order a deploy
uses.

To exercise the *production* file instead — the compose wiring, not the certificate path:

```powershell
docker build -t ph-api:local src/playhaus-api
docker build -t ph-app:local --build-arg EXPO_PUBLIC_API_URL=http://localhost src/playhaus-app

cd deployment/server
$env:API_IMAGE = "ph-api:local"; $env:APP_IMAGE = "ph-app:local"
$env:DOMAIN = "localhost"; $env:ACME_EMAIL = "you@example.com"
$env:DATABASE_URL = "postgres://postgres:<password>@host.docker.internal:5432/playhausdb?sslmode=disable"
docker compose run --rm --no-deps --entrypoint /app/ph-migrate api
docker compose up -d
curl.exe http://localhost/api/v1/health
```

PowerShell has no `VAR=value command` prefix, so the variables are set first and stay set
for the rest of the session — which is what you want, since `docker compose down` needs
them too. The Git Bash one-liner equivalent is
`API_IMAGE=... APP_IMAGE=... DOMAIN=localhost ACME_EMAIL=... DATABASE_URL=... docker compose up -d`.

Caddy issues itself a local certificate for `localhost`, so expect a browser warning on
the HTTPS port. Tear it down with `docker compose down` — **not** `down -v`, which takes
the certificates with it.

---

## Two things knowingly left undone

- **Backups are the database host's.** Nothing in this directory takes one.
- **`ssh-keyscan` in CI** accepts the droplet's host key on first sight each run rather
  than pinning it. To pin it: run `ssh-keyscan -H <ip>` locally, store the output as a
  `DEPLOY_HOST_KEY` secret, and replace the keyscan line in both workflows with
  `printf '%s\n' "$DEPLOY_HOST_KEY" > ~/.ssh/known_hosts`.
