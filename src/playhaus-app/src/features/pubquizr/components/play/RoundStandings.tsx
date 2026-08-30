import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

interface Props {
    /** Best first. Ties keep their seating order. */
    standings: Seat[]
    /** The round just finished. */
    round: number
    /**
     * Starts the next one, or null when there is no next one this build can play.
     *
     * Null is what turns this from a breather into an ending: the notice appears, the
     * action becomes the way out, and nobody is left waiting for a question that is
     * never coming.
     */
    onNext: (() => void) | null
    onLeave: () => void
}

/**
 * Where everyone stands with a round behind them.
 *
 * A round has to end with something, and a scoreboard is the thing a pub quiz ends rounds
 * with. It is also the beat the table needs: the phone changes hands, somebody reads the
 * scores out, and the next round starts when everybody is ready rather than the instant
 * the last answer is marked.
 *
 * The same screen is the honest place to stop, too. When there is no next round to start
 * it says so, because the session really has moved on — and the alternative is a screen
 * that either pretends the game is over or leaves the table waiting.
 *
 * It headlines the round that just ended and nothing else. It used to headline the one
 * about to start as well, back when it was the only screen that could — `RoundIntroScreen`
 * now stands between this and the first hand-off of the next round, and says it there
 * with room to say it properly. Both would be the same round named twice in a row.
 */
export default function RoundStandings({ standings, round, onNext, onLeave }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // Only the outright leader gets the lemon row. On a tie nobody is winning, and two
    // highlighted rows would say otherwise.
    const top = standings[0]?.score ?? 0;
    const outright = standings.filter(seat => seat.score === top).length === 1;

    return (
        <View style={styles.screen}>
            <SimpleTextHero
                title={t('pubquizr.play.standings.title', { round })}
                description={t('pubquizr.play.standings.description')}
            />

            <View style={styles.list}>
                {standings.map((seat, index) => {
                    const leading = index === 0 && outright;

                    return (
                        <View key={seat.seat} style={[styles.row, leading && styles.leader]}>
                            <AppText style={[styles.place, leading && styles.onLemonMuted]}>
                                {index + 1}
                            </AppText>

                            <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
                                <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                                    {seat.initials}
                                </AppText>
                            </View>

                            <AppText
                                style={[styles.name, leading && styles.onLemon]}
                                numberOfLines={1}
                            >
                                {seat.name}
                            </AppText>

                            <AppText style={[styles.score, leading && styles.onLemon]}>
                                {seat.score}
                            </AppText>
                        </View>
                    )
                })}
            </View>

            <View style={styles.footer}>
                {onNext === null ? (
                    <>
                        <InlineNotification
                            icon="tool"
                            color={theme.colors.blush}
                            message={t('pubquizr.play.standings.nextRoundWip', { round: round + 1 })}
                        />

                        <ActionButton
                            size="large"
                            icon="home"
                            text={t('common.backToGames')}
                            onPress={onLeave}
                        />
                    </>
                ) : (
                    <ActionButton
                        size="large"
                        icon="arrow-right"
                        text={t('pubquizr.play.standings.startNext', { round: round + 1 })}
                        onPress={onNext}
                    />
                )}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // The gutters are this screen's own: the board it stands in front of has claimed the
    // app's chrome, which hands every page on this route the bare window. See
    // `useChromeless`.
    screen: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.four,
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
        ...theme.shadows.hardSmall
    },

    // Lemon in both schemes, like every other "this is the one" in the app.
    leader: {
        backgroundColor: theme.colors.lemon,
        borderColor: Brand.ink
    },

    place: {
        width: 16,
        fontSize: 12,
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

    // `minWidth: 0` is what lets a long name truncate instead of pushing the score
    // off the end of the row.
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    score: {
        fontSize: 18,
        fontWeight: 900,
        color: theme.colors.text
    },

    // The leader's row is lemon in both schemes, so its ink has to be too — the dark
    // scheme's own near-white text would disappear into it.
    onLemon: {
        color: Brand.ink
    },

    onLemonMuted: {
        color: 'rgba(15, 13, 18, 0.5)'
    },

    footer: {
        marginTop: 'auto',
        gap: Spacing.three
    }
}))
