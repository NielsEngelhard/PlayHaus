import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme, View } from 'react-native';
import Header from '@/components/layout/Header';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.page}>
        <View style={styles.content}>
          <Header />

          <Slot />
        </View>        
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    width: '100%'
  },
  content: {
    maxWidth: 600,
    width: '100%',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',    
  }
})
