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
A   @       <reserved ip>   TTL 300
A   www     <reserved ip>   TTL 300
A   stats   <reserved ip>   TTL 300
```

`stats` is the Beszel dashboard (see **Monitoring**). Caddy asks for its certificate the
moment the `stats.{$DOMAIN}` block loads, which is the first deploy after this file
changed — so the record has to exist before then, not after.

Then wait, and check:

```powershell
Resolve-DnsName playhaus.site -Type A | Select-Object Name, IPAddress
Resolve-DnsName stats.playhaus.site -Type A | Select-Object Name, IPAddress
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
| Secret | `STATS_TOKEN` | **optional** — a long random string guarding `GET /api/v1/admin/stats`. Leave it unset and the route does not exist. |
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
panics a minute after starting would not, and the workflow would not notice.

Something else does now: the DigitalOcean uptime check in `terraform/monitoring.tf` polls
`https://playhaus.site/api/v1/health` from outside and emails within a few minutes. That
closes the hole rather than the workflow closing it — a bad deploy still goes green, you
just hear about it. So check by hand after shipping something you are unsure of:

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

## Monitoring

Four things watch this box, deliberately small ones. A Prometheus and Grafana stack wants
more memory than the droplet has to spare, so none of this collects a time series longer
than it needs.

### Where to look

| Question | Where |
| --- | --- |
| Is the site up, seen from outside? | DigitalOcean → Monitoring → Uptime, plus an email when it is not |
| Is the droplet running out of memory, CPU or disk? | DigitalOcean → Monitoring → Alerts, plus an email |
| Which *container* is using it? | `https://stats.playhaus.site` |
| Is the Go process leaking goroutines or rooms? | `GET /api/v1/admin/stats` |

### The DigitalOcean half — Terraform

`terraform/monitoring.tf` owns all of it, so changing a threshold is an edit and an
`apply`, not a click. Three alert policies (memory > 90% for 10m, CPU > 80% for 30m, disk
> 80% for 5m) and one uptime check against `/api/v1/health` from two regions, with a
`down_global` alert and an SSL-expiry alert.

The check targets the **health endpoint, not `/`**. Per the 502 section above, `/` is
served by nginx off its own disk and keeps answering 200 with the API dead — it would
report the site up during exactly the outage worth knowing about. `/api/v1/health` proves
caddy → app → api.

Two things to confirm once, by hand, because neither fails loudly:

- **That the email arrives.** DigitalOcean delivers alerts to account and team member
  addresses; another address is accepted by the API and then silently never delivered.
  Force one: `ssh deploy@<ip>` then `stress-ng --vm 1 --vm-bytes 700M --timeout 700s`.
- **That `do-agent` is running** — `systemctl status do-agent`. The memory and disk
  metrics come from it, and an agent-dependent alert with no agent never fires and never
  errors.

These are account-level resources, so they sit outside the PlayHaus project in the
console rather than beside the droplet. Expected.

### Beszel — the per-container dashboard

`https://stats.playhaus.site`, basic auth first and then Beszel's own login. One system,
with `playhaus-api-1`, `playhaus-app-1`, `playhaus-caddy-1` and the two Beszel containers
charted individually. Retention is fixed at about 30 days, averaged as it ages.

Two containers in the compose file: `beszel` (the hub, a PocketBase app on SQLite) and
`beszel-agent` (host-networked, reading the Docker socket). Nothing builds them.

**They ship exactly the way `caddy` does.** Both deploy workflows copy
`deployment/server/` up on every run, so the definition arrives with the next deploy of
either half; `deploy.sh` then starts them by name, because neither workflow would
otherwise. **Upgrading is editing both pinned tags — hub and agent must match — and
running either workflow.** Rollback is the same edit in reverse.

First run, once:

1. Deploy. The hub starts; the agent does not, and says so, because there is no token yet.
2. Open `https://stats.playhaus.site`, get past basic auth, create the admin account
   **immediately** — the setup wizard belongs to whoever reaches it first, which is the
   main thing the basic auth in front of it is buying.
3. Add a system: name it, host `127.0.0.1`, port `45876`. Copy the token it generates.
4. On the droplet: `printf '%s' '<token>' | ./set-env.sh BESZEL_TOKEN`
5. `docker compose up -d --no-deps beszel-agent`, then
   `docker compose logs beszel-agent` for a clean registration.

The agent registers by dialing *out* to the hub over a websocket, so port 45876 is never
opened in the firewall and nothing new is reachable from the internet.

Worth knowing: the agent mounts the Docker socket, and `:ro` on a unix socket stops the
file being replaced and nothing else. That is full Docker API access, which is root on the
host. The narrower option is a socket proxy via `DOCKER_HOST`, which the agent supports;
not done here.

### The Go stats endpoint

The numbers no container can see: goroutines, heap, GC, and the realtime hub's live room
and connection counts. A leaked room is invisible in container memory until the box OOMs,
because Go returns memory to the OS lazily.

```
curl.exe -H "X-Stats-Token: <token>" https://playhaus.site/api/v1/admin/stats
```

Not behind `requireAuth`: that proves only that *some* session is valid, and
`POST /api/v1/user/guest` hands one to anyone who asks. There is no admin role in this
codebase, so the route carries its own shared secret and compares it in constant time.
**Unset `STATS_TOKEN` means the route is never registered** — a 404, indistinguishable
from a build that never had it, which is what development and CI run with.

`connections` should return to zero after a game ends and `rooms` should empty with it. A
count that only climbs is the leak this endpoint exists to show.

### Memory limits

Every service in the compose file carries a `mem_limit`. They are ceilings, not
reservations, and their sum exceeds 1 GB on purpose. The point is *who dies*: without
them the host OOM killer picks the largest process, which is always the API, and leaves
nothing explaining why. With them the runaway container is the one that dies and
`docker inspect <container> | grep -i oom` says so.

Check the numbers against reality before changing one:

```
ssh deploy@<ip> "cd /opt/playhaus && docker stats --no-stream"
```

The LIMIT column should show the ceilings; each should sit at roughly a third of its own.

---

## Changing the domain

Three places, and the last one is the one people forget:

1. `domain` in `terraform.tfvars`, then `terraform apply` — this affects the outputs, and
   the uptime check in `monitoring.tf`, which is targeted by name.
2. `DOMAIN=` in `/opt/playhaus/.env` on the droplet, then
   `docker compose up -d --no-deps caddy`. All three A records — `@`, `www` and `stats` —
   have to exist on the new name first, for the reason in step 5 of the first-time setup.
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
