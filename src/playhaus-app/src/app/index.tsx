import AppText from '@/components/text/AppText';
import BigIntroText from '@/components/text/BigIntroText';
import { useHeaderTag } from '@/components/layout/HeaderTagContext';
import NavigationCard from '@/components/ui/NavigationCard';
import { LEAGUE_OF_LETTERS_NAME, PUBQUIZR_NAME } from '@/constants/games';
import { APP_VERSION } from '@/constants/global-constants';
import { ROUTES } from '@/constants/routes';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { RelativePathString } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const GAMES = [
  {
    tag: 'Word · 1-4 players',
    color: Colors.light.primary,
    name: LEAGUE_OF_LETTERS_NAME,
    description: 'Domineer met jouw Vocabulair, solo of tegen je vrienden.',
    playable: true,
    navigationUrl: ROUTES.leagueOfLettersIndex,
  },
  {
    tag: 'Trivia · 2-10 players',
    color: Colors.light.secondary,
    name: PUBQUIZR_NAME,
    description: 'Snelle pubquiz rondes. Nog even geduld, de vragen worden geslepen.',
    playable: false,
    navigationUrl: ROUTES.quizzerIndex,
  },
];

export default function HomeScreen() {
  useHeaderTag(APP_VERSION);

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

const styles = StyleSheet.create({
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
    color: Colors.light.textSecondary
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
    color: Colors.light.textSecondary
  },
  footer: {
    marginTop: Spacing.six,
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary
  }
});
