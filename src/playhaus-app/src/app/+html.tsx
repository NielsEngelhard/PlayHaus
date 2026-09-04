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
            </head>
            <body {...bodyAttributes}>
                {children}
                {bodyNodes}
            </body>
        </html>
    );
}
