import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useEntrance } from "@/components/ui/useEntrance";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Animated, Easing, View } from "react-native";

// Matches the single-device/board round intro's own finalist stagger.
const FINALIST_STAGGER_MS = 140;
const FINALIST_ENTER_MS = 320;

interface Props {
    /** The two the finale is between, in the order the round opened them. */
    finalists: [Seat, Seat]
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
}

// Both finalists at once, which the roles corner cannot do: that only ever names whoever is being asked.
export default function TableFinalists({ finalists, scale }: Props) {
    const styles = useStyles();
    const t = useT();

    const [first, second] = finalists;

    const versusEntrance = useEntrance({
        delayMs: FINALIST_STAGGER_MS + FINALIST_ENTER_MS,
        durationMs: 240,
        easing: Easing.out(Easing.back(2.2))
    });

    return (
        <View style={[styles.row, { gap: Math.round(16 * scale) }]}>
            <Finalist delayMs={0} scale={scale} seat={first} />

            <Animated.View
                style={{
                    opacity: versusEntrance,
                    transform: [{ scale: versusEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]
                }}
            >
                <AppText style={[styles.versus, { fontSize: Math.round(13 * scale) }]}>
                    {t('pubquizr.play.intro.versus')}
                </AppText>
            </Animated.View>

            <Finalist delayMs={FINALIST_STAGGER_MS} scale={scale} seat={second} />
        </View>
    )
}

interface FinalistProps {
    delayMs: number
    scale: number
    seat: Seat
}

// One of the two, as a face and a name.
function Finalist({ delayMs, scale, seat }: FinalistProps) {
    const styles = useStyles();
    const t = useT();
    const entrance = useEntrance({ delayMs, durationMs: FINALIST_ENTER_MS, easing: Easing.out(Easing.back(1.6)) });

    return (
        <Animated.View
            style={[
                styles.finalist,
                { gap: Math.round(9 * scale) },
                {
                    opacity: entrance,
                    transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]
                }
            ]}
        >
            <SeatAvatar raised seat={seat} size={Math.round(40 * scale)} />

            <View>
                <AppText numberOfLines={1} style={[styles.name, { fontSize: Math.round(20 * scale) }]}>
                    {seat.name}
                </AppText>

                {seat.stars !== undefined && (
                    <AppText numberOfLines={1} style={[styles.tally, { fontSize: Math.round(13 * scale) }]}>
                        {t('pubquizr.play.final.tally', { stars: seat.stars, score: seat.score })}
                    </AppText>
                )}
            </View>
        </Animated.View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    finalist: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    name: {
        fontWeight: 900,
        color: theme.colors.text
    },
    tally: {
        fontWeight: 800,
        color: theme.colors.textSecondary
    },
    versus: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    }
}))
