/**
 * The document the static web export is rendered into.
 *
 * Expo ships a default version of this file, and everything below the `no-zoom` block is
 * a copy of it — charset, the IE compatibility header, `ScrollViewStyleReset` (the root
 * reset react-native-web needs so a full-height `ScrollView` behaves like it does on
 * native) and the `useServerDocumentContext` nodes that `<Head>` and friends inject.
 * Writing our own means owning those too: as soon as this file exists Expo stops
 * rendering its own.
 *
 * This runs on the server only, at export time. It is not part of the client bundle, so
 * nothing here can hold state or read a hook of ours — the one way to reach the browser
 * from here is a raw `<script>`, which is exactly what the zoom lock below is.
 *
 * It is also, in practice, the whole of the app's PWA configuration. The Metro-based
 * `expo export --platform web` writes no web manifest — the webpack-era PWA plugin that
 * used to generate one is gone — so a phone asked to add the site to its home screen
 * finds nothing declaring an icon, and iOS falls back to a screenshot of the page while
 * Chrome falls back to the favicon. `public/manifest.json` and the PNGs beside it are
 * plain files that Expo copies into `dist/` verbatim; the tags below are what tell a
 * browser they are there.
 */

import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Kills the zoom gestures a viewport meta cannot.
 *
 * `user-scalable=no` has been ignored by mobile Safari since iOS 10 — Apple decided a
 * page may not take pinch-zoom away — so on an iPhone the meta tag below buys us only
 * the half that still works: no auto-zoom when a text field takes focus. The rest has to
 * be said in JavaScript, by cancelling the gestures themselves:
 *
 * - `gesturestart`/`gesturechange`/`gestureend` are Safari's own pinch events, and
 *   cancelling the first one is what actually stops an iOS pinch.
 * - `touchmove` with more than one finger down covers the older WebKits that fire no
 *   gesture events. The app has no multi-touch of its own, so nothing is lost.
 * - `wheel` with `ctrlKey` is a trackpad pinch (and ctrl+scroll) on the desktop, which
 *   is the same gesture asking for the same thing.
 *
 * All of them need `passive: false`, because a passive listener is not allowed to
 * cancel. Deliberately *not* touched: ⌘/ctrl +/- and the browser's own zoom menu. Those
 * are the reader's accessibility settings rather than a stray gesture mid-game, they
 * survive a reload, and most browsers will not let a page cancel them anyway.
 *
 * Double-tap-to-zoom is handled declaratively instead, by `touch-action` in
 * `src/global.css`, which also stops Chrome and Android from pinching.
 */
const noZoom = `
(function () {
    function cancel(event) { event.preventDefault(); }
    var options = { passive: false };

    document.addEventListener('gesturestart', cancel, options);
    document.addEventListener('gesturechange', cancel, options);
    document.addEventListener('gestureend', cancel, options);

    document.addEventListener('touchmove', function (event) {
        if (event.touches.length > 1) event.preventDefault();
    }, options);

    window.addEventListener('wheel', function (event) {
        if (event.ctrlKey) event.preventDefault();
    }, options);
})();
`;

export default function Root({ children }: PropsWithChildren) {
    const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

    return (
        <html lang="en" {...htmlAttributes}>
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                {/*
                 * `maximum-scale=1` and `user-scalable=no` are the half of the zoom lock
                 * a browser can honour on its own: together they stop Android from
                 * pinching and stop iOS from zooming in when a keyboard opens on a text
                 * field. See `noZoom` for the half they cannot.
                 */}
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no"
                />
                <ScrollViewStyleReset />
                <script dangerouslySetInnerHTML={{ __html: noZoom }} />
                {headNodes}

                {/*
                 * The tab icon. Expo injects a `rel="icon"` of its own onto pages it
                 * renders with the default document, but this file *is* the document, so
                 * that injection stops and the link has to be said here. Both files sit
                 * in `public/`.
                 */}
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

                <link rel="manifest" href="/manifest.json" />

                {/*
                 * iOS reads none of the manifest for Add to Home Screen — not the icon,
                 * not the name, not the display mode. Everything it honours is said here
                 * instead, and `apple-touch-icon` is the specific tag whose absence left
                 * a screenshot on the home screen.
                 */}
                <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-title" content="Playhaus" />

                {/*
                 * `apple-mobile-web-app-capable` is formally deprecated in favour of the
                 * second one, but it is still the only spelling iOS acts on, so both ship.
                 */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-capable" content="yes" />

                {/*
                 * `default`, not `black-translucent`. Translucent draws the page
                 * underneath the status bar, which is only survivable with
                 * `viewport-fit=cover` and `env(safe-area-inset-*)` — and the viewport
                 * meta above deliberately sets no `viewport-fit`, so a translucent bar
                 * would launch the app with the clock sitting on top of `Header`.
                 */}
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />

                {/*
                 * The colour the OS paints its own chrome with, straight from
                 * `Colors.light.background` in `@/constants/theme` — written out by hand
                 * because this file renders in Node and cannot read a hook. Keep the two
                 * in step, and in step with `public/manifest.json`, which says the same
                 * colour to an installed copy.
                 *
                 * One value, with no `prefers-color-scheme` pair. A media query here
                 * would answer for the *device*, and the app no longer follows the device
                 * at all: it opens light on every phone and only the in-app toggle moves
                 * it, which is React state this tag cannot see. A dark bar around a light
                 * app is the mismatch that costs something; a light bar around the dark
                 * scheme somebody chose themselves is only the launch window.
                 */}
                <meta name="theme-color" content="#FBF7F0" />
            </head>
            <body {...bodyAttributes}>
                {children}
                {bodyNodes}
            </body>
        </html>
    );
}
