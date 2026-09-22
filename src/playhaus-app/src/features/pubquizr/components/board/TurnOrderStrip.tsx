import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const LEAD_AVATAR = 20;
const PATH_AVATAR = 34;
const PAIR_AVATAR = 26;
const BADGE = 18;
// Wide enough for a name under the avatar without the five of them touching.
const STOP_WIDTH = 52;
// The strip's micro-type sits below the smallest step of `FontSizes`.
const CAPS_SIZE = 9;
const SMALL_SIZE = 10;
const RING_WIDTH = 1.5;

/** The turn as one line of people: who asks, and the order the question walks the table in. */
export interface TurnOrder {
    /** The small caps word before the lead: "Quizmaster", "No quizmaster". */
    label: string
    /** Whoever runs the turn, and null in a round nobody does. */
    lead: Seat | null
    /** Said instead of a lead's name, when there is no lead. */
    leadNote?: string
    /** The far right of the top row: "Turn 2 / 5", "Everyone at once". */
    count: string
    /** The seats the question walks, in order. Empty in the rounds where it does not walk. */
    path: Seat[]
    /** Who the question is with now. */
    current: number | null
    /** Everybody it has already beaten. */
    missed: number[]
}

/** The two people a round 4 or 5 turn is between, drawn instead of a path. */
export interface TurnPair {
    from: Seat
    fromLabel: string
    to: Seat
    toLabel: string
    count: string
}

interface Props {
    /** This phone's seat, so it can call itself "You". */
    mySeat: number | null
    order?: TurnOrder
    pair?: TurnPair
}

// The strip every phone wears under the band when there is no shared screen: the whole turn order, at a glance.
export default function TurnOrderStrip({ mySeat, order, pair }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const nameOf = (seat: Seat) => seat.seat === mySeat ? t('pubquizr.board.you') : seat.name;

    if (pair !== undefined) {
        return (
            <View style={styles.card}>
                <View style={styles.row}>
                    <PairEnd seat={pair.from} label={pair.fromLabel} name={nameOf(pair.from)} styles={styles} />

                    <Feather name="arrow-right" size={14} color={theme.colors.textMuted} />

                    <PairEnd seat={pair.to} label={pair.toLabel} name={nameOf(pair.to)} styles={styles} />

                    <AppText style={styles.count} numberOfLines={1}>{pair.count}</AppText>
                </View>
            </View>
        )
    }

    if (order === undefined) return null;

    const missed = new Set(order.missed);

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <AppText style={styles.label} numberOfLines={1}>{order.label}</AppText>

                {order.lead !== null && (
                    <View style={styles.leadRing}>
                        <AppText style={styles.leadInitials}>{order.lead.initials}</AppText>
                    </View>
                )}

                <AppText style={styles.leadName} numberOfLines={1}>
                    {order.lead !== null ? nameOf(order.lead) : order.leadNote ?? ''}
                </AppText>

                <AppText style={styles.count} numberOfLines={1}>{order.count}</AppText>
            </View>

            {order.path.length > 0 && (
                <View style={styles.path}>
                    <View pointerEvents="none" style={styles.line} />

                    {order.path.map((seat, index) => {
                        const now = seat.seat === order.current;
                        const out = missed.has(seat.seat);

                        return (
                            // Keyed on the seat's `now` status, so the marker visibly lifts as the turn walks onto it.
                            <SlideFadeIn
                                key={seat.seat}
                                style={styles.stop}
                                offsetY={-6}
                                durationMs={220}
                                replayKey={`${seat.seat}-${now}`}
                            >
                                <View style={out && styles.faded}>
                                    <SeatAvatar seat={seat} size={PATH_AVATAR} raised={now} />

                                    <View style={[styles.badge, now && styles.badgeNow]}>
                                        {out
                                            ? <Feather name="x" size={10} color={Brand.ink} />
                                            : <AppText style={styles.badgeText}>{index + 1}</AppText>}
                                    </View>
                                </View>

                                <AppText
                                    style={[styles.stopName, (now || seat.seat === mySeat) && styles.stopNameStrong, out && styles.faded]}
                                    numberOfLines={1}
                                >
                                    {nameOf(seat)}
                                </AppText>
                            </SlideFadeIn>
                        )
                    })}
                </View>
            )}
        </View>
    )
}

interface PairEndProps {
    label: string
    name: string
    seat: Seat
    styles: ReturnType<typeof useStyles>
}

function PairEnd({ label, name, seat, styles }: PairEndProps) {
    return (
        <View style={styles.pairEnd}>
            <SeatAvatar seat={seat} size={PAIR_AVATAR} />

            <View style={styles.pairText}>
                <AppText style={styles.pairLabel} numberOfLines={1}>{label}</AppText>

                <AppText style={styles.pairName} numberOfLines={1}>{name}</AppText>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    label: {
        flexShrink: 0,
        fontSize: CAPS_SIZE,
        fontWeight: 900,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    // Lemon in both schemes: the quizmaster is a marker on the strip, the same one the host screen uses.
    leadRing: {
        width: LEAD_AVATAR,
        height: LEAD_AVATAR,
        borderRadius: Radii.full,
        borderWidth: RING_WIDTH,
        borderColor: Brand.ink,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Brand.lemon
    },

    leadInitials: {
        fontSize: CAPS_SIZE - 2,
        fontWeight: 900,
        color: Brand.ink
    },

    leadName: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    },

    count: {
        marginLeft: 'auto',
        flexShrink: 0,
        fontSize: SMALL_SIZE,
        fontWeight: 900,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    path: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
    },

    // Runs between the first and last avatar's centres, behind them.
    line: {
        position: 'absolute',
        left: STOP_WIDTH / 2,
        right: STOP_WIDTH / 2,
        top: PATH_AVATAR / 2,
        height: 2,
        backgroundColor: theme.colors.borderMuted
    },

    stop: {
        width: STOP_WIDTH,
        alignItems: 'center',
        gap: 5
    },

    faded: {
        opacity: 0.45
    },

    badge: {
        position: 'absolute',
        top: -5,
        right: -6,
        width: BADGE,
        height: BADGE,
        borderRadius: Radii.full,
        borderWidth: RING_WIDTH,
        borderColor: Brand.ink,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Brand.textOnAccent
    },

    badgeNow: {
        backgroundColor: Brand.lemon
    },

    badgeText: {
        fontSize: CAPS_SIZE,
        fontWeight: 900,
        color: Brand.ink
    },

    stopName: {
        fontSize: SMALL_SIZE,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    stopNameStrong: {
        fontWeight: 900,
        color: theme.colors.text
    },

    pairEnd: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    pairText: {
        flexShrink: 1,
        minWidth: 0
    },

    pairLabel: {
        fontSize: CAPS_SIZE,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    pairName: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    }
}))
