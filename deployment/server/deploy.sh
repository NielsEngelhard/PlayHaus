#!/bin/sh
#
# Roll one half of the stack. Run on the droplet by a GitHub Actions job, never by hand
# -- though running it by hand is exactly how you roll back, see deployment/README.md.
#
#   usage: deploy.sh <VAR> <image ref> <service>
#   e.g.   deploy.sh API_IMAGE ghcr.io/nielsengelhard/playhaus-api:sha-1a2b3c4d5e6f api
#
# The image reference is written into /opt/playhaus/.env and the service is recreated
# from it. Two things about that are deliberate:
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

# Rewrite the one line, keeping every other. Not `sed -i`, because that quietly does
# nothing when the key is absent -- which is the first-deploy case -- and because an
# image reference contains slashes and colons that would have to be escaped.
touch .env
grep -v "^${var}=" .env > .env.tmp || true
printf '%s=%s\n' "$var" "$image" >> .env.tmp
mv .env.tmp .env

docker compose pull "$service"
docker compose up -d --no-deps "$service"

# Caddy belongs to neither workflow, so nobody would start it otherwise. A no-op once it
# is up.
docker compose up -d --no-deps caddy

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
