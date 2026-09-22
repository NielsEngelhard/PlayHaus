import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { useEntrance } from "@/components/ui/useEntrance";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { Animated, Easing, View } from "react-native";

const ROW_STAGGER_MS = 45;

interface Props {
    /** Best first. Ties keep their seating order. */
    standings: Seat[]
    /** The round just finished. */
    round: number
    // Starts the next one, or null when there is no next one this build can play.
    onNext: (() => void) | null
    onLeave: () => void
}

// Where everyone stands with a round behind them.
export default function RoundStandings({ standings, round, onNext, onLeave }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // Only the outright leader gets the lemon row.
    const top = standings[0]?.score ?? 0;
    const outright = standings.filter(seat => seat.score === top).length === 1;

    return (
        <View style={styles.screen}>
            <View style={styles.list}>
                {standings.map((seat, index) => (
                    <StandingsRow
                        key={seat.seat}
                        index={index}
                        leading={index === 0 && outright}
                        seat={seat}
                    />
                ))}
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

interface StandingsRowProps {
    index: number
    leading: boolean
    seat: Seat
}

// One row of the list, staggered in behind the ones above it, with the leader given a small settle-in pop.
function StandingsRow({ index, leading, seat }: StandingsRowProps) {
    const styles = useStyles();

    const highlight = useEntrance({
        delayMs: index * ROW_STAGGER_MS + 180,
        durationMs: 260,
        easing: Easing.out(Easing.back(1.8))
    });

    return (
        <SlideFadeIn offsetY={10} durationMs={220} delayMs={index * ROW_STAGGER_MS}>
            <Animated.View
                style={[
                    styles.row,
                    leading && styles.leader,
                    leading && { transform: [{ scale: highlight.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }] }
                ]}
            >
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
            </Animated.View>
        </SlideFadeIn>
    )
}

const useStyles = createThemedStyles(theme => ({
    // The gutters are this screen's own.
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

    // `minWidth: 0` is what lets a long name truncate instead of pushing the score off the end of the row.
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

    // The leader's row is lemon in both schemes, so its ink has to be too.
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
