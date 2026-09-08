// The document the static web export is rendered into.

import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Kills the zoom gestures a viewport meta cannot.
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
                {/* `maximum-scale=1` and `user-scalable=no` are the half of the zoom lock a browser can honour on its own. */}
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no"
                />
                <ScrollViewStyleReset />
                <script dangerouslySetInnerHTML={{ __html: noZoom }} />
                {headNodes}

                {/* The tab icon. */}
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

                <link rel="manifest" href="/manifest.json" />

                {/* iOS reads none of the manifest for Add to Home Screen — not the icon, not the name, not the display mode. */}
                <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-title" content="Playhaus" />

                {/* `apple-mobile-web-app-capable` is formally deprecated in favour of the second one, but it is still the only spelling iOS acts on. */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-capable" content="yes" />

                {/* `default`, not `black-translucent`. */}
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />

                {/* The colour the OS paints its own chrome with, straight from `Colors.light.background` in `@/constants/theme`. */}
                <meta name="theme-color" content="#FBF7F0" />
            </head>
            <body {...bodyAttributes}>
                {children}
                {bodyNodes}
            </body>
        </html>
    );
}
