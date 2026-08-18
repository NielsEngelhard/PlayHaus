import AppText from '@/components/text/AppText';
import BigIntroText from '@/components/text/BigIntroText';
import NavigationCard from '@/components/ui/NavigationCard';
import { GAMES } from '@/constants/games';
import { FontSizes, Spacing } from '@/constants/theme';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { RelativePathString } from 'expo-router';
import { View } from 'react-native';

export default function HomeScreen() {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <BigIntroText
          title='Tiny games,'
          accent='big fun.'
        />

        <AppText style={styles.introText}>
          Kleine spelletjes voor op die gezellige ochtend, middagen en avonden.
        </AppText>
      </View>

      <View style={styles.games}>
        <AppText style={styles.sectionTitle}>Games</AppText>

        {GAMES.map((game, index) => (
          // The cards sit a hair off-square, alternating direction, the way they do
          // in the design.
          <View
            key={game.name}
            style={{ transform: [{ rotate: index % 2 === 0 ? '-0.6deg' : '0.5deg' }] }}
          >
            <NavigationCard
              tag={game.tag}
              color={game.color}
              name={game.name}
              description={game.description}
              playable={game.playable}
              navigationUrl={game.navigationUrl as RelativePathString}
            />
          </View>
        ))}
      </View>

      <AppText style={styles.footer}>Veel speelplezier</AppText>
    </View>
  );
}

const useStyles = createThemedStyles(theme => ({
  container: {
    width: '100%'
  },
  intro: {
    marginBottom: Spacing.five
  },
  introText: {
    marginTop: Spacing.four,
    maxWidth: 448,
    fontSize: FontSizes.md,
    lineHeight: FontSizes.md * 1.6,
    color: theme.colors.textSecondary
  },
  games: {
    gap: Spacing.four
  },
  sectionTitle: {
    paddingHorizontal: Spacing.one,
    fontSize: FontSizes.xs,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    color: theme.colors.textSecondary
  },
  footer: {
    marginTop: Spacing.six,
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: theme.colors.textSecondary
  }
}));
