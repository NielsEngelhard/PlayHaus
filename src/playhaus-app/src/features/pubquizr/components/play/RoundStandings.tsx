import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/round-one";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

interface Props {
    /** Best first. Ties keep their seating order. */
    standings: Seat[]
    round: number
    onLeave: () => void
}

/**
 * Where everyone stands with a round behind them.
 *
 * The round has to end with something, and a scoreboard is the thing a pub quiz ends
 * rounds with. It is also the honest place to say that the next round is not built
 * yet: the session really has moved on to round 2, so the alternative is a screen that
 * either pretends the game is over or leaves the table waiting for a question that is
 * never coming.
 */
export default function RoundStandings({ standings, round, onLeave }: Props) {
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
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%',
        paddingTop: Spacing.three,
        paddingBottom: 26,
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
