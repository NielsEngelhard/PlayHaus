import BottomBar from '@/components/layout/BottomBar';
import { FullScreenProvider, useChromelessValue, useFullScreenValue } from '@/components/layout/FullScreenContext';
import Header from '@/components/layout/Header';
import { PageToneProvider, usePageToneValue } from '@/components/layout/PageToneContext';
import SlideFadeIn from '@/components/ui/SlideFadeIn';
import { headerOverAccent } from '@/constants/header-context';
import { BottomBarHeight, ContentWidth, Spacing } from '@/constants/theme';
import { MusicProvider } from '@/features/audio/MusicContext';
import AuthGate from '@/features/auth/components/AuthGate';
import { AuthProvider } from '@/features/auth/useAuth';
import FeedbackPreferencesSync from '@/features/feedback/FeedbackPreferencesSync';
import { LanguageProvider } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { ThemeProvider, useThemeMode, useThemeReady } from '@/features/theme/ThemeContext';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, Slot, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

/**
 * How long a page takes to arrive. Long enough to be read as a turn of the page, short
 * enough that somebody moving quickly through the app never waits on it.
 */
const PAGE_MS = 220;
/**
 * How far it travels on the way in. A hint of sideways movement rather than a full
 * sweep: at this size the animation says which direction you went without the page
 * having to cross the screen to say it, and it stays quiet on a wide web window.
 */
const PAGE_SLIDE = 28;

/** How deep a route sits, which is what tells forward from back. See `Chrome`. */
function depthOf(pathname: string): number {
  return pathname.split('/').filter(Boolean).length;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Everything that needs to know the scheme. Split from the layout above only because a
 * component cannot read a context its own render puts in place.
 */
function App() {
  const { scheme } = useThemeMode();
  const themeReady = useThemeReady();

  // Loaded at runtime rather than through the expo-font config plugin, because the
  // plugin only covers native and this app also ships to web.
  //
  // Required by file path rather than imported from '@expo-google-fonts/outfit':
  // that package's index `require`s all nine weights, so importing from it makes
  // Metro bundle every cut even though we only register four.
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular: require('@expo-google-fonts/outfit/400Regular/Outfit_400Regular.ttf'),
    Outfit_500Medium: require('@expo-google-fonts/outfit/500Medium/Outfit_500Medium.ttf'),
    Outfit_700Bold: require('@expo-google-fonts/outfit/700Bold/Outfit_700Bold.ttf'),
    Outfit_900Black: require('@expo-google-fonts/outfit/900Black/Outfit_900Black.ttf'),
  });

  // Covers the font error case on purpose: if a font fails to load we'd rather show
  // the app in the system font than strand the user on the splash screen.
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    // Held for the stored theme as well, which is read back asynchronously. Letting
    // the app appear first would mean anyone who chose dark watches it paint light
    // and then correct itself.
    if (fontsSettled && themeReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsSettled, themeReady]);

  // Native only. `output: "static"` pre-renders these routes in Node, where fonts
  // never resolve, so gating on web would export blank HTML for every page. Web
  // instead paints immediately and swaps the font in — a normal FOUT.
  if (!fontsSettled && Platform.OS !== 'web') {
    return null;
  }

  return (
    <NavigationThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      {/* Outside everything it gates, so the popup can cover the chrome too. */}
      <AuthProvider>
        {/* Draws nothing. Copies the account's sound and vibration switches out to where
            the code that plays a sound can read them — see `features/feedback`. */}
        <FeedbackPreferencesSync />

        {/* Inside `AuthProvider` because the account's `locale` is what it resolves, and
            outside `FullScreenProvider` so the gate is translated along with the page it
            covers. Adds no gate to the splash screen above: the catalogs are bundled and
            the device's language is read synchronously, so there is nothing to wait for. */}
        <LanguageProvider>
          {/* Above `Slot`, so the one claim slot outlives the page handing it over: a
              lobby starting a game swaps the loop without the music stopping in between.
              A lobby and a board inside claim their scene with `useMusic`; everywhere
              else is silent. */}
          <MusicProvider>
            {/* Wraps the chrome, so a game page inside `Slot` can claim the whole viewport. */}
            <FullScreenProvider>
              {/* And the whole window's colour with it — see `PageToneContext`. */}
              <PageToneProvider>
                <Chrome />

                {/* Renders nothing at all while signed in. */}
                <AuthGate />
              </PageToneProvider>
            </FullScreenProvider>
          </MusicProvider>
        </LanguageProvider>
      </AuthProvider>
    </NavigationThemeProvider>
  );
}

/**
 * The page frame. Split out of the layout because it reads `useFullScreenValue()`, and
 * the provider that answers that is rendered by the layout itself.
 */
function Chrome() {
  const fullScreen = useFullScreenValue();
  const chromeless = useChromelessValue();
  const tone = usePageToneValue();
  const styles = useStyles();
  const pathname = usePathname();

  /*
   * Which way the next page comes in from.
   *
   * Worked out from the route's depth rather than from history, because there is no
   * history here to read: going back is a `Link` to a parent href (see `BackChip`)
   * rather than a pop, and the game flow moves with `router.replace`. Depth is what
   * actually matches the shape of the app — deeper is further in, shallower is on the
   * way out — and a sideways move between two screens at the same depth is a step
   * onwards, which is what the settings-to-board hop is.
   *
   * Adjusted during render rather than in an effect, so the incoming page is already
   * offset on the commit that mounts it. Set from an effect it would paint once at its
   * resting place and then jump back to start the slide.
   */
  const [seen, setSeen] = useState(() => ({ path: pathname, from: 0 }));
  if (seen.path !== pathname) {
    setSeen({
      path: pathname,
      from: depthOf(pathname) < depthOf(seen.path) ? -PAGE_SLIDE : PAGE_SLIDE
    });
  }
  // Nothing to slide in from on the very first paint: opening the app is not a
  // navigation, and animating it would put a stutter right after the splash screen.
  const enterFrom = seen.path === pathname ? seen.from : 0;

  const body = (
    <View style={[styles.content, fullScreen && styles.contentFullScreen]}>
      {/* Outside the animation: the header is the app's chrome rather than part of the
          page, and a wordmark sliding in on every route would be the one thing on
          screen insisting it had changed too.

          Gone entirely on a chromeless page, which draws a header of its own and would
          otherwise have two — see `useChromeless`. */}
      {!chromeless && (
        <View style={headerOverAccent(pathname) && styles.headerAbove}>
          <Header />
        </View>
      )}

      <SlideFadeIn
        // What replays the entrance — and deliberately not a `key`.
        //
        // The router mounts the new page in a commit of its own, which `usePathname`
        // only catches up with on the next one. A key taken from the path therefore
        // arrives a render too late: it threw away the page that had already mounted and
        // built it again, so every screen ran its opening request twice. `replayKey`
        // replays the animation without touching what is inside it, which leaves one
        // mounted page at a time — the thing `FullScreenContext` relies on — to the
        // router, where it belongs.
        replayKey={pathname}
        offsetX={enterFrom}
        durationMs={PAGE_MS}
        style={fullScreen ? styles.pageSlotFullScreen : styles.pageSlot}
      >
        <Slot />
      </SlideFadeIn>
    </View>
  );

  return (
    <View style={styles.page}>
      {/*
        * A page's own colour, taken all the way out to the window's edges.
        *
        * A layer rather than a background on `page` itself: the canvas underneath is a
        * tiled image as well as a colour, and covering it is a great deal simpler than
        * unsetting it on two platforms. First child, so everything else draws over it,
        * and `pointerEvents="none"` so it never stands between a press and the page.
        */}
      {tone !== null && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tone }]} />
      )}

      {/*
        * One scroller for both modes, switched rather than swapped.
        *
        * This used to be a `ScrollView` or a plain `View` depending on `fullScreen`, and
        * that is a different element in the same position — so React tore the whole page
        * down and built it again the moment a page claimed the viewport. Every page that
        * claims it does so from an effect, i.e. just after it has mounted, so every
        * full-screen page mounted twice and ran its opening request twice. In the room
        * that was fatal: the first mount's join landed after the second mount had already
        * joined, and its tidy-up handed the seat straight back.
        *
        * `flex: 1` on the content container rather than the usual `flexGrow: 1` is what
        * keeps the ceiling the full-screen mode needs. `flexGrow` makes the height a
        * minimum, which a board would grow past until it pushed its own keyboard off the
        * bottom edge; `flex` pins it to the scroller's own height, exactly as the plain
        * `View` did.
        */}
      <ScrollView
        style={[styles.scroll, fullScreen && styles.scrollFullScreen]}
        contentContainerStyle={
          chromeless
            ? styles.chromelessContent
            : fullScreen ? styles.fullScreenContent : styles.scrollContent
        }
        scrollEnabled={!fullScreen}
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>

      {/* Sibling of the scroller, not a child: it stays put while the page moves. */}
      {!fullScreen && <BottomBar />}
    </View>
  );
}

const useStyles = createThemedStyles(theme => ({
  page: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    ...theme.pageBackground,
  },
  scroll: {
    width: '100%',
  },
  // Passes the window's height into the scroller, so the content container below has
  // something to pin itself to.
  scrollFullScreen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    // Clears the floating BottomBar, which overlays the page rather than sitting in it.
    paddingBottom: BottomBarHeight + Spacing.six,
  },
  fullScreenContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    // Nothing floats over the page in this mode, so it may use the bottom edge.
    paddingBottom: Spacing.four,
  },
  // The same, without the gutters: a page that has taken the chrome paints its own
  // header and its own footer, and both run to the edges of the column.
  chromelessContent: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    maxWidth: ContentWidth,
    width: '100%',
    flexDirection: 'column',
  },
  /*
   * Lifts the header over the page below it, for the routes whose page paints up into
   * the header's 66dp — see `headerOverAccent`.
   *
   * Only where it is asked for. The page slot is drawn after the header, so raising it
   * everywhere would put the chrome on top of the one screen that is supposed to cover
   * it: the pubquizR hand-off is a wall you must not be able to read past, and a back
   * chip floating on it is a way past.
   */
  headerAbove: {
    zIndex: 1,
  },
  // Passes the window's height down, which is what lets a page claim the room left
  // under `Header` with a plain `flex: 1`.
  contentFullScreen: {
    flex: 1,
  },
  // The transition wrapper stands between `content` and the page, so it has to pass
  // both of those down untouched — it is only supposed to be moving the page, not
  // changing what size it gets.
  pageSlot: {
    width: '100%',
  },
  // Carries the height ceiling through in full-screen mode. Without the `flex: 1` the
  // wrapper would size to its content instead of to the window, and a board that
  // measures itself against its parent would grow until it pushed its own keyboard off
  // the bottom edge.
  pageSlotFullScreen: {
    flex: 1,
    width: '100%',
  }
}));
