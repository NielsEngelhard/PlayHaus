import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import BottomBar from '@/components/layout/BottomBar';
import { FullScreenProvider, useFullScreenValue } from '@/components/layout/FullScreenContext';
import Header from '@/components/layout/Header';
import { BottomBarHeight, Spacing } from '@/constants/theme';
import AuthGate from '@/features/auth/components/AuthGate';
import { AuthProvider } from '@/features/auth/useAuth';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { ThemeProvider, useThemeMode, useThemeReady } from '@/features/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    // Nothing else provides this: the layout renders a bare `Slot` rather than a
    // navigator, so `BottomBar` would have no insets to read without it.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {/* Outermost of the app's own providers, because everything below it — the
          navigator's own theme included — is drawn in whichever scheme it resolves. */}
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
      {/* The clock and battery sit on the app's own canvas, so they take the
          opposite ink to it rather than the device's. */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      {/* Outside everything it gates, so the popup can cover the chrome too. */}
      <AuthProvider>
        {/* Wraps the chrome, so a game page inside `Slot` can claim the whole viewport. */}
        <FullScreenProvider>
          <Chrome />

          {/* Renders nothing at all while signed in. */}
          <AuthGate />
        </FullScreenProvider>
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
  const styles = useStyles();

  const body = (
    <View style={[styles.content, fullScreen && styles.contentFullScreen]}>
      <Header />

      <Slot />
    </View>
  );

  return (
    <View style={styles.page}>
      {fullScreen ? (
        // A plain View rather than the ScrollView with scrolling switched off. A scroll
        // container's height is a *minimum*: content that wants more simply makes it
        // taller. A page that has to fit the window needs a ceiling to size down against,
        // and only a non-scrolling parent gives it one — otherwise the game's board grows
        // and pushes its own keyboard off the bottom edge.
        <View style={styles.fullScreenBody}>{body}</View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      )}

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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    // Clears the floating BottomBar, which overlays the page rather than sitting in it.
    paddingBottom: BottomBarHeight + Spacing.six,
  },
  fullScreenBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    // Nothing floats over the page in this mode, so it may use the bottom edge.
    paddingBottom: Spacing.four,
  },
  content: {
    maxWidth: 600,
    width: '100%',
    flexDirection: 'column',
  },
  // Passes the window's height down, which is what lets a page claim the room left
  // under `Header` with a plain `flex: 1`.
  contentFullScreen: {
    flex: 1,
  }
}));
