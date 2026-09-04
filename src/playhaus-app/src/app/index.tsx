import AppText from '@/components/text/AppText';
import BigIntroText from '@/components/text/BigIntroText';
import Label from '@/components/text/Label';
import TextHint from '@/components/text/TextHint';
import GameTeaserCard from '@/components/ui/GameTeaserCard';
import { GAMES } from '@/constants/games';
import { Spacing } from '@/constants/theme';
import JoinCodeRow from '@/features/home/components/JoinCodeRow';
import ReconnectChip from '@/features/home/components/ReconnectChip';
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

        <View style={styles.reconnect}>
          <ReconnectChip />
        </View>
      </View>

      {/* Above the list rather than under it: someone opening the app with four
          characters in hand is here to use them, not to read the menu. */}
      <View style={styles.join}>
        <JoinCodeRow />
      </View>

      <View style={styles.startNew}>
        <Label label={t('home.startNew')} rule />
      </View>

      <View style={styles.games}>
        {GAMES.map(game => (
          <GameTeaserCard
            key={game.slug}
            color={game.color}
            gradient={game.gradient}
            glyphInk={game.glyphInk[theme.scheme]}
            name={game.name}
            icon={game.icon}
            description={t(game.descriptionKey)}
            deviceMode={game.deviceMode}
            minMaxPlayers={game.minMaxPlayersIndicator}
            isNew={game.isNew}
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
  reconnect: {
    marginTop: 14
  },
  join: {
    marginTop: Spacing.three
  },
  startNew: {
    marginTop: 18
  },
  games: {
    gap: 14
  }
}));
