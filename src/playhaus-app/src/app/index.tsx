import AppText from '@/components/text/AppText';
import BigIntroText from '@/components/text/BigIntroText';
import TextHint from '@/components/text/TextHint';
import GameTeaserCard from '@/components/ui/GameTeaserCard';
import { GAMES } from '@/constants/games';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { RelativePathString } from 'expo-router';
import { View } from 'react-native';

export default function HomeScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const t = useT();


  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <BigIntroText
          title={t('home.headline.title')}
          accent={t('home.headline.accent')}
        />

        <AppText style={styles.introText}>{t('home.subtitle')}</AppText>
      </View>

      <View style={styles.games}>
        {GAMES.map(game => (
          <GameTeaserCard
            key={game.slug}
            color={game.color}
            gradient={game.gradient}
            glyphInk={game.glyphInk[theme.scheme]}
            name={game.name}
            description={t(game.descriptionKey)}
            deviceMode={game.deviceMode}
            minMaxPlayers={game.minMaxPlayersIndicator}
            playable={game.playable}
            navigationUrl={game.navigationUrl as RelativePathString}
            durationInMinutes={game.minutesAverage}
          />
        ))}
      </View>

      <TextHint text={t("home.bottomTeaser")} />
    </View>
  );
}

const useStyles = createThemedStyles(theme => ({
  container: {
    width: '100%'
  },
  intro: {
    marginTop: Spacing.two
  },
  introText: {
    marginTop: 10,
    maxWidth: 290,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: theme.colors.textSecondary
  },
  games: {
    marginTop: 20,
    gap: 14
  }
}));
