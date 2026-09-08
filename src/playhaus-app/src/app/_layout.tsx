import BottomBar from '@/components/layout/BottomBar';
import { FullScreenProvider, useChromelessValue, useFullScreenValue } from '@/components/layout/FullScreenContext';
import Header from '@/components/layout/Header';
import { PageToneProvider, usePageToneValue } from '@/components/layout/PageToneContext';
import SlideFadeIn from '@/components/ui/SlideFadeIn';
import { APP_NAME } from '@/constants/global-constants';
import { headerOverAccent } from '@/constants/header-context';
import { BottomBarHeight, ContentWidth, Spacing } from '@/constants/theme';
import { MusicProvider } from '@/features/audio/MusicContext';
import AuthGate from '@/features/auth/components/AuthGate';
import { AuthProvider } from '@/features/auth/useAuth';
import FeedbackPreferencesSync from '@/features/feedback/FeedbackPreferencesSync';
import { LanguageProvider } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { ThemeProvider, useScheme, useThemeReady } from '@/features/theme/ThemeContext';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, Slot, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

// How long a page takes to arrive.
const PAGE_MS = 220;
// How far it travels on the way in.
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

// Everything that needs to know the scheme.
function App() {
  const { scheme } = useScheme();
  const themeReady = useThemeReady();

  // Loaded at runtime rather than through the expo-font config plugin.
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular: require('@expo-google-fonts/outfit/400Regular/Outfit_400Regular.ttf'),
    Outfit_500Medium: require('@expo-google-fonts/outfit/500Medium/Outfit_500Medium.ttf'),
    Outfit_700Bold: require('@expo-google-fonts/outfit/700Bold/Outfit_700Bold.ttf'),
    Outfit_900Black: require('@expo-google-fonts/outfit/900Black/Outfit_900Black.ttf'),
  });

  // Covers the font error case on purpose.
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    // Held for the stored theme as well, which is read back asynchronously.
    if (fontsSettled && themeReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsSettled, themeReady]);

  // Native only.
  if (!fontsSettled && Platform.OS !== 'web') {
    return null;
  }

  return (
    <NavigationThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      {/* Web only, and only to name the browser tab. */}
      {Platform.OS === 'web' && (
        <Head>
          <title>{APP_NAME}</title>
        </Head>
      )}

      {/* Outside everything it gates, so the popup can cover the chrome too. */}
      <AuthProvider>
        {/* Draws nothing. */}
        <FeedbackPreferencesSync />

        {/* Inside `AuthProvider` because the account's `locale` is what it resolves. */}
        <LanguageProvider>
          {/* Above `Slot`, so the one claim slot outlives the page handing it over. */}
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

// The page frame.
function Chrome() {
  const fullScreen = useFullScreenValue();
  const chromeless = useChromelessValue();
  const tone = usePageToneValue();
  const styles = useStyles();
  const pathname = usePathname();

  // Which way the next page comes in from.
  const [seen, setSeen] = useState(() => ({ path: pathname, from: 0 }));
  if (seen.path !== pathname) {
    setSeen({
      path: pathname,
      from: depthOf(pathname) < depthOf(seen.path) ? -PAGE_SLIDE : PAGE_SLIDE
    });
  }
  // Nothing to slide in from on the very first paint.
  const enterFrom = seen.path === pathname ? seen.from : 0;

  const body = (
    <View style={[styles.content, fullScreen && styles.contentFullScreen]}>
      {/* Outside the animation: the header is the app's chrome rather than part of the page. */}
      {!chromeless && (
        <View style={headerOverAccent(pathname) && styles.headerAbove}>
          <Header />
        </View>
      )}

      <SlideFadeIn
        // What replays the entrance — and deliberately not a `key`.
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
      {/* A page's own colour, taken all the way out to the window's edges. */}
      {tone !== null && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tone }]} />
      )}

      {/* One scroller for both modes, switched rather than swapped. */}
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
  // Passes the window's height into the scroller, so the content container below has something to pin itself to.
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
  // The same, without the gutters: a page that has taken the chrome paints its own header and its own footer.
  chromelessContent: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    maxWidth: ContentWidth,
    width: '100%',
    flexDirection: 'column',
  },
  // Lifts the header over the page below it, for the routes whose page paints up into the header's 66dp.
  headerAbove: {
    zIndex: 1,
  },
  // Passes the window's height down, which is what lets a page claim the room left under `Header` with a plain `flex: 1`.
  contentFullScreen: {
    flex: 1,
  },
  // The transition wrapper stands between `content` and the page, so it has to pass both of those down untouched.
  pageSlot: {
    width: '100%',
  },
  // Carries the height ceiling through in full-screen mode.
  pageSlotFullScreen: {
    flex: 1,
    width: '100%',
  }
}));
