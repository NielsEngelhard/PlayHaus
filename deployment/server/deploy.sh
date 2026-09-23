#!/bin/sh
#
# Roll one half of the stack. Run on the droplet by a GitHub Actions job, never by hand
# -- though running it by hand is exactly how you roll back, see deployment/README.md.
#
#   usage: deploy.sh <VAR> <image ref> <service>
#   e.g.   deploy.sh API_IMAGE ghcr.io/nielsengelhard/playhaus-api:sha-1a2b3c4d5e6f api
#
# The service is recreated from the image reference, which is then recorded in
# /opt/playhaus/.env. For the api, ph-migrate runs first. Two things are deliberate:
#
#   * The tag is an exact commit sha, not :latest. Chasing :latest would mean a backend
#     deploy could quietly also ship whatever frontend build happened to be newest, and
#     it would leave nothing to edit when you need to go back. Rolling back is changing
#     one line in this file and re-running the last two commands.
#
#   * --no-deps. Only the named service is touched. A backend deploy therefore cannot
#     reload a player's open page, and at bootstrap neither workflow fails because the
#     other half's image does not exist in the registry yet.

set -eu

if [ $# -ne 3 ]; then
	echo "usage: $0 <VAR> <image ref> <service>" >&2
	exit 2
fi

var=$1
image=$2
service=$3

cd /opt/playhaus

# Exported rather than written to .env yet: compose prefers the shell over .env, so this
# deploy runs the new image while .env still names the old one. It is written below, once
# the container is up -- a failed migration therefore leaves .env pointing at a version
# the schema still suits, not at one a later `docker compose up` would start unmigrated.
export "$var=$image"

docker compose pull "$service"

# The api image carries ph-migrate next to ph-api. It runs here, from the exact image about
# to be started and before the running container is touched, so a migration or seed that
# fails stops the deploy under set -e and the old version keeps serving. This is the only
# place migrations run: the API never applies them, it refuses to start while any are
# pending.
#
# A migration is not undone by rolling back. Old code on a newer schema has to cope, so a
# migration that drops or renames something wants a release of its own, after the code
# has stopped using it.
if [ "$service" = api ]; then
	docker compose run --rm --no-deps --entrypoint /app/ph-migrate api
fi

docker compose up -d --no-deps "$service"
printf '%s' "$image" | ./set-env.sh "$var"

# Caddy belongs to neither workflow, so nobody would start it otherwise. A no-op once it
# is up.
docker compose up -d --no-deps caddy

# Beszel belongs to neither workflow either, for the same reason, and is started the same
# way. Both lines swallow their failure on purpose: the dashboard watching the deploy must
# never be the thing that fails one.
#
# The hub goes up unconditionally, because its first run is where the agent's credentials
# come from. The agent waits for both of them to exist -- started without them it would
# only restart-loop, and the reason would be three levels down in a log nobody is reading.
# It needs both: TOKEN identifies the agent to the hub, KEY identifies the hub to the
# agent, and missing either is the same restart loop.
docker compose up -d --no-deps beszel ||
	echo "warning: beszel hub did not start -- check 'docker compose logs beszel'" >&2

# The hub writes an ed25519 key into its data volume on first start. Derive the public
# half here rather than having someone paste it in: it is not a secret, it is not chosen
# by anyone, and deriving it means the agent is still correct by itself after the
# beszel-data volume is recreated -- which mints a new key and would otherwise leave the
# agent refusing to connect, with nothing in the deploy saying why. No wait loop is
# needed: the key exists long before a token does, and the agent needs both.
if key_dir=$(docker volume inspect playhaus_beszel-data --format '{{.Mountpoint}}' 2>/dev/null) &&
	sudo test -f "$key_dir/id_ed25519"; then
	hub_key=$(sudo ssh-keygen -y -f "$key_dir/id_ed25519" 2>/dev/null || true)
	if [ -n "$hub_key" ] && ! grep -qF "BESZEL_KEY='$hub_key'" .env; then
		printf '%s' "$hub_key" | ./set-env.sh BESZEL_KEY
	fi
fi

if grep -q "^BESZEL_TOKEN=" .env && grep -q "^BESZEL_KEY=" .env; then
	docker compose up -d --no-deps beszel-agent ||
		echo "warning: beszel agent did not start -- check 'docker compose logs beszel-agent'" >&2
else
	echo "note: beszel-agent is not started -- .env has no BESZEL_TOKEN yet. The key above" >&2
	echo "      is derived automatically; only the token is yours to supply. Add a system" >&2
	echo "      at https://stats.\${DOMAIN}, then:" >&2
	echo "        printf '%s' '<token>' | ./set-env.sh BESZEL_TOKEN" >&2
fi

# And then make it re-read its config, which the line above does not do. The Caddyfile is
# bind-mounted, so editing it changes nothing compose can see -- the service definition is
# identical and `up -d` leaves the container alone. Without this, a Caddyfile the deploy
# job just copied up would sit on disk doing nothing until somebody restarted the
# container by hand.
#
# `caddy reload` is graceful: no dropped connections, and no new certificate.
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile ||
	echo "warning: caddy did not reload -- check 'docker compose logs caddy'" >&2

docker compose ps
