# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# package-lock.json needs npm 11.19.0 or newer

Do not commit a `package-lock.json` written by npm 11.6.2 or any earlier 11.x. Those versions
have a bug in how they resolve *optional* peer dependencies: they drop the top-level
`@emnapi/core` and `@emnapi/runtime` entries that `@napi-rs/wasm-runtime` peer-depends on
(it arrives, dev-only and optional, under eslint's `unrs-resolver`). Nothing local notices —
`npm install`, `npm start` and `expo export` all work fine without them.

The deploy does notice. `deployment`'s app image builds on `node:20-bookworm-slim`, whose npm
10.8.2 *does* want those two entries, so `npm ci` stops the Docker build dead with

    npm ci can only install packages when your package.json and package-lock.json ... are in sync
    Missing: @emnapi/core@1.11.3 from lock file
    Missing: @emnapi/runtime@1.11.3 from lock file

This is a version bug, not a platform one: npm 11.19.0 and npm 10.8.2 agree, and only the
11.x versions in between disagree. So the fix is `npm i -g npm@latest` on the machine that
regenerates the lockfile, not a change to the Dockerfile. If a lockfile has already been
committed in the broken state, regenerate it against the image the deploy actually uses:

    docker run --rm -v "$PWD":/app -w /app node:20-bookworm-slim npm install

`npm ci` succeeding locally proves nothing here, because the local npm is the one that wrote
the file. The check that matters is `npm ci` inside `node:20-bookworm-slim`.
