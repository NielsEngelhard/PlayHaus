import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { FinalStanding } from "@/features/pubquizr/round-six";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** Winner first. See `finalStandingsOf`. */
    standings: FinalStanding[]
    onLeave: () => void
}

/**
 * Where the whole evening ended: every seat, its final place, and the finale that
 * decided the top two.
 *
 * The one screen this session ends on. `RoundStandings` stands between rounds and is
 * built to be walked past — a breather with a button to the next thing. This has no next
 * thing. It headlines the winner rather than the round just played, because there is no
 * round just played any more, and it is the only screen in the evening that has to say
 * out loud that the game itself is over.
 *
 * The most points wins, and every row carries the same number — a finale question pays
 * onto the running score like everything else does, at a hundred a time, so there is one
 * tally and one order to put the table in. The two who played round 6 are tagged rather
 * than ranked apart: it is the story of the evening, not the reason for the order.
 */
export default function FinalResultsScreen({ standings, onLeave }: Props) {
    const t = useT();
    const styles = useStyles();

    const winner = standings[0];

    return (
        <View style={styles.screen}>
            <SimpleTextHero
                title={t('pubquizr.play.final.title')}
                description={winner === undefined
                    ? t('pubquizr.play.final.description')
                    : t('pubquizr.play.final.won', { name: winner.name })}
            />

            <View style={styles.list}>
                {standings.map(seat => {
                    const first = seat.place === 1;
                    const second = seat.place === 2;

                    return (
                        <View
                            key={seat.seat}
                            style={[styles.row, first && styles.winner, second && styles.runnerUp]}
                        >
                            <View style={styles.place}>
                                {first ? (
                                    <Feather name="award" size={16} color={Brand.ink} />
                                ) : (
                                    <AppText style={[styles.placeText, second && styles.onLemonMuted]}>
                                        {seat.place}
                                    </AppText>
                                )}
                            </View>

                            <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
                                <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                                    {seat.initials}
                                </AppText>
                            </View>

                            <View style={styles.who}>
                                <AppText
                                    style={[styles.name, (first || second) && styles.onLemon]}
                                    numberOfLines={1}
                                >
                                    {seat.name}
                                </AppText>

                                {seat.finalist && (
                                    <AppText style={[styles.tag, (first || second) && styles.onLemonMuted]}>
                                        {t('pubquizr.play.final.finalist')}
                                    </AppText>
                                )}
                            </View>

                            <AppText style={[styles.score, (first || second) && styles.onLemon]}>
                                {seat.score}
                            </AppText>
                        </View>
                    )
                })}
            </View>

            <View style={styles.footer}>
                <ActionButton
                    size="large"
                    icon="home"
                    text={t('common.backToGames')}
                    onPress={onLeave}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%',
        paddingTop: Spacing.three,
        gap: Spacing.four
    },

    list: {
        gap: 8
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    // Lemon for the winner, the same "this is the one" every leader row in the app
    // wears.
    winner: {
        backgroundColor: theme.colors.lemon,
        borderColor: Brand.ink
    },

    // The runner-up gets the mint this game pays finale points in, so the two top rows
    // read as a pair that finished the same finale apart, rather than one winner and a
    // list.
    runnerUp: {
        backgroundColor: theme.colors.mint,
        borderColor: Brand.ink
    },

    place: {
        width: 22,
        alignItems: 'center',
        justifyContent: 'center'
    },

    placeText: {
        fontSize: 13,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.textMuted
    },

    avatar: {
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 12,
        fontWeight: 900
    },

    who: {
        flex: 1,
        minWidth: 0
    },

    name: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    tag: {
        marginTop: 1,
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: theme.colors.textMuted
    },

    score: {
        fontSize: 18,
        fontWeight: 900,
        color: theme.colors.text
    },

    // The top two rows are lemon and mint in both schemes, so their ink has to be too —
    // the dark scheme's own near-white text would disappear into either fill.
    onLemon: {
        color: Brand.ink
    },

    onLemonMuted: {
        color: 'rgba(15, 13, 18, 0.6)'
    },

    footer: {
        marginTop: 'auto',
        gap: Spacing.three
    }
}))
