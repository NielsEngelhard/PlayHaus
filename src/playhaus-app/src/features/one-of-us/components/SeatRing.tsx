import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, withAlpha } from "@/constants/theme";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

/** What one seat is doing this phase. */
export type SeatMark =
    | 'normal'
    | 'muted'
    | 'focus'
    | 'chosen'
    | 'out'

interface Props {
    /** Everybody the ring is drawing, in seating order. */
    seats: Seat[]
    /** Picking is in flight — the seats stay drawn, they just stop answering. */
    disabled?: boolean
    /** What the middle actually says: a name, or a short instruction. */
    headline: string
    /** The small uppercase line in the middle, above the headline. */
    label?: string
    /** How to draw each one. Every seat is `normal` if this is left out. */
    markOf?: (seat: Seat) => SeatMark
    /** Makes the seats buttons. Left out on the phases that only report. */
    onPick?: (seat: Seat) => void
}

const SIZE = 220;
const RADIUS = 86;
const SEAT = 42;
const FOCUS = 54;

export default function SeatRing({
    seats,
    disabled = false,
    headline,
    label,
    markOf,
    onPick
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.ring}>
            <View
                style={styles.guide}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            />

            <View style={styles.hub}>
                {label !== undefined && (
                    <AppText style={styles.label}>{label}</AppText>
                )}

                <AppText style={styles.headline} numberOfLines={2}>
                    {headline}
                </AppText>
            </View>

            {seats.map((seat, index) => {
                const mark = markOf?.(seat) ?? 'normal';
                const grown = mark === 'focus' || mark === 'chosen';
                const diameter = grown ? FOCUS : SEAT;

                // First seat at twelve o'clock, the rest dealt clockwise. Positioned by
                // its own diameter, so a grown seat keeps the centre point it had.
                const angle = (-90 + (index * 360) / seats.length) * (Math.PI / 180);
                const position = {
                    width: diameter,
                    height: diameter,
                    left: SIZE / 2 + RADIUS * Math.cos(angle) - diameter / 2,
                    top: SIZE / 2 + RADIUS * Math.sin(angle) - diameter / 2
                };

                const faded = mark === 'muted' || mark === 'out';

                const body = (
                    <>
                        <SeatAvatar seat={seat} size={diameter} raised={grown} />

                        {/* The tick is the only thing besides the size that separates a
                            chosen seat from a lit one, so a vote reads as aimed from
                            across a table rather than as somebody's turn. */}
                        {mark === 'chosen' && (
                            <View style={styles.badge}>
                                <Feather name="check" size={11} color={Brand.ink} />
                            </View>
                        )}

                        {/* Struck where they sat. The seat stays in place for this one
                            screen precisely so the table sees the gap appear. */}
                        {mark === 'out' && (
                            <View style={styles.cross} pointerEvents="none">
                                <Feather
                                    name="x"
                                    size={26}
                                    color={theme.colors.destructive}
                                />
                            </View>
                        )}
                    </>
                );

                if (onPick === undefined) {
                    return (
                        <View
                            key={seat.seat}
                            accessibilityLabel={seat.name}
                            style={[styles.seat, position, faded && styles.faded]}
                        >
                            {body}
                        </View>
                    )
                }

                return (
                    <PopPressable
                        key={seat.seat}
                        onPress={() => onPick(seat)}
                        disabled={disabled}
                        accessibilityRole="radio"
                        accessibilityLabel={seat.name}
                        accessibilityState={{ selected: mark === 'chosen', disabled }}
                        style={[styles.seat, position, faded && styles.faded]}
                    >
                        {body}
                    </PopPressable>
                )
            })}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    ring: {
        width: SIZE,
        height: SIZE,
        alignSelf: 'center'
    },
    guide: {
        position: 'absolute',
        top: SIZE / 2 - RADIUS,
        left: SIZE / 2 - RADIUS,
        width: RADIUS * 2,
        height: RADIUS * 2,
        borderRadius: 999,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.boardEmptyBorder
    },
    hub: {
        position: 'absolute',
        top: 52,
        left: 52,
        right: 52,
        bottom: 52,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: withAlpha(theme.colors.violet, 0.3)
    },

    label: {
        marginBottom: 3,
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
        textAlign: 'center',
        color: theme.colors.textMuted
    },

    headline: {
        fontSize: 22,
        fontWeight: 900,
        lineHeight: 22 * 1.1,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    seat: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center'
    },
    faded: {
        opacity: 0.45
    },

    badge: {
        position: 'absolute',
        right: -4,
        bottom: -4,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    cross: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center'
    }
}))
