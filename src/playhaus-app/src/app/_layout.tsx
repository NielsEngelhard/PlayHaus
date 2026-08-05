import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import Header from '@/components/layout/Header';
import { PageBackground, Spacing } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

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

  useEffect(() => {
    // Covers the error case on purpose: if a font fails to load we'd rather show
    // the app in the system font than strand the user on the splash screen.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Native only. `output: "static"` pre-renders these routes in Node, where fonts
  // never resolve, so gating on web would export blank HTML for every page. Web
  // instead paints immediately and swaps the font in — a normal FOUT.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.page}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Header />

            <Slot />
          </View>
        </ScrollView>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    ...PageBackground,
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  content: {
    maxWidth: 600,
    width: '100%',
    flexDirection: 'column',
  }
})
