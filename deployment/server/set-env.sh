#!/bin/sh
#
# Set one variable in /opt/playhaus/.env, keeping every other line.
#
#   usage: printf '%s' "$value" | set-env.sh <VAR>
#
# The value comes in on stdin, never as an argument, because it can be a secret: an
# argument is visible in `ps` to every user on the box for as long as the command runs,
# and ends up in the GitHub Actions log of the ssh command that passed it.
#
# It is written single-quoted. Compose interpolates $ inside an unquoted or double-quoted
# .env value, and a generated database password is exactly the kind of string that
# contains one. Single quotes are literal, with no escape for a quote itself -- hence the
# refusal below rather than a mangled password.

set -eu

if [ $# -ne 1 ]; then
	echo "usage: printf '%s' value | $0 <VAR>" >&2
	exit 2
fi

var=$1
value=$(cat)

if [ -z "$value" ]; then
	echo "set-env: refusing to write an empty $var" >&2
	exit 1
fi
case $value in
*"'"* | *"
"*)
	echo "set-env: $var contains a single quote or a newline, which .env cannot hold" >&2
	exit 1
	;;
esac

cd /opt/playhaus

# Not `sed -i`, because that quietly does nothing when the key is absent -- which is the
# first-deploy case -- and because the values contain slashes and colons that would have
# to be escaped.
touch .env
# Captured before the mv below replaces the file. Run this by hand as root and the new
# .env comes out root-owned 600, the deploy user can no longer write it, and the next CI
# run fails on `touch: cannot touch '.env': Permission denied` -- an error that names
# neither root nor this script. Restoring the owner is only possible as root, hence the
# guard: an unprivileged chown of a file to its existing owner is not portable.
owner=$(stat -c '%u:%g' .env)

grep -v "^${var}=" .env > .env.tmp || true
printf "%s='%s'\n" "$var" "$value" >> .env.tmp
# 600: the file holds the database password now, not just image tags.
chmod 600 .env.tmp
mv .env.tmp .env

if [ "$(id -u)" = 0 ]; then
	chown "$owner" .env
fi
