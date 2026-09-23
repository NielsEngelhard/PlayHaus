import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { Brand, FontSizes, Radii, ShadowReach, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import QuestionCount from "@/features/pubquizr/components/play/QuestionCount";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Fragment, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, View, type ViewStyle } from "react-native";

const QUIZMASTER_AVATAR = 22;
const SEAT_AVATAR = 30;
const CURRENT_AVATAR = 38;
const CURRENT_BORDER = 2;
// Tall enough for the current seat's avatar plus its shadow, so every column's name sits on one line.
const AVATAR_SLOT = 40;
// Five of these and their chevrons fit a 366dp phone without scrolling.
const COLUMN = 48;
const CHEVRON = 9;
const RING = 3;
const FADE = 28;
const HAIRLINE = 1.5;
const PAIR_AVATAR = 26;
// The strip's micro-type sits below the smallest step of `FontSizes`.
const NAME_SIZE = 11;
const CHIP_SIZE = 10;
// Stands in for the name while the sentence is split around it, so the name can be set bold in any language's word order.
const NAME_MARK = '\u0000';

/** The turn as one line of people: who asks, and the order the question walks the table in. */
export interface TurnOrder {
    /** Said in place of the quizmaster line when there is no lead: "No quizmaster". */
    label: string
    /** Whoever runs the turn, and null in a round nobody does. */
    lead: Seat | null
    /** The chip on the lead's own phone ("2 / 5"), or the status line when there is no path to walk. */
    count: string
    /** The seats the question walks, in order. Empty in the rounds where it does not walk. */
    path: Seat[]
    /** Who the question is with now. */
    current: number | null
    /** 1-based: question 3 of 8 in the round. */
    number: number
    total: number
}

/** The two people a round 4 or 5 turn is between, drawn instead of a path. */
export interface TurnPair {
    from: Seat
    fromLabel: string
    to: Seat
    toLabel: string
    number: number
    total: number
}

interface Props {
    /** This phone's seat, so it can call itself "You". */
    mySeat: number | null
    order?: TurnOrder
    pair?: TurnPair
}

// A wash from nothing into a fill, left to right.
function washToRight(color: string): ViewStyle {
    const gradient = `linear-gradient(to right, ${color}00, ${color})`;

    return Platform.select<ViewStyle>({
        web: { backgroundImage: gradient } as ViewStyle,
        default: { experimental_backgroundImage: gradient } as ViewStyle
    })!;
}

// The card every phone wears under the band when there is no shared screen: who asks, and the whole turn order at a glance.
export default function TurnOrderStrip({ mySeat, order, pair }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const scroller = useRef<ScrollView>(null);
    const stops = useRef(new Map<number, number>());
    const [viewWidth, setViewWidth] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);

    const current = order?.current ?? null;

    // Brings whoever has the question into the middle on a table too long for one row; a row that fits has nowhere to scroll.
    useEffect(() => {
        const x = current === null ? undefined : stops.current.get(current);
        if (x === undefined || viewWidth === 0) return;

        scroller.current?.scrollTo({ x: Math.max(0, x + COLUMN / 2 - viewWidth / 2), animated: true });
    }, [current, viewWidth, contentWidth]);

    const you = t('pubquizr.board.you');
    const nameOf = (seat: Seat) => seat.seat === mySeat ? you : seat.name;

    if (pair !== undefined) {
        return (
            <View style={styles.card}>
                <View style={styles.row}>
                    <PairEnd seat={pair.from} label={pair.fromLabel} name={nameOf(pair.from)} styles={styles} />

                    <Feather name="arrow-right" size={14} color={theme.colors.textMuted} />

                    <PairEnd seat={pair.to} label={pair.toLabel} name={nameOf(pair.to)} styles={styles} />

                    <View style={styles.push}>
                        <QuestionCount number={pair.number} total={pair.total} />
                    </View>
                </View>
            </View>
        )
    }

    if (order === undefined) return null;

    const leading = order.lead !== null && order.lead.seat === mySeat;
    const leadName = order.lead === null ? null : leading ? you : order.lead.name;
    const leadTemplate = order.lead === null
        ? order.label
        : t(leading ? 'pubquizr.board.turnOrder.youAreQuizmaster' : 'pubquizr.board.turnOrder.isQuizmaster', { name: NAME_MARK });
    const leadLine = leadName === null ? leadTemplate : leadTemplate.replace(NAME_MARK, leadName);

    const walking = order.path.length > 0;
    const at = order.path.findIndex(seat => seat.seat === order.current);
    const up = at < 0 ? null : order.path[at];

    const status = up === null
        ? order.count
        : up.seat === mySeat
            ? t('pubquizr.board.turnOrder.youAreUp')
            : t('pubquizr.board.turnOrder.isUp', { name: up.name });

    const after = at < 0 ? [] : order.path.slice(at + 1).map(nameOf);
    const spoken = [
        t('pubquizr.play.questionNumber', { number: order.number })
        + t('pubquizr.play.questionTotal', { total: order.total }),
        leadLine,
        after.length > 0
            ? `${status}, ${t('pubquizr.board.turnOrder.then', { names: listOf(after, t('pubquizr.board.turnOrder.and')) })}`
            : status
    ].join('. ') + '.';

    const overflowing = contentWidth > viewWidth + 1;
    const lift = `${ShadowReach.hardSmall}px ${ShadowReach.hardSmall}px 0 0 ${theme.colors.shadow}`;
    const ring = `0 0 0 ${RING}px ${Brand.lemon}`;

    return (
        <View style={styles.card} accessible accessibilityRole="text" accessibilityLabel={spoken}>
            <View style={styles.row}>
                {order.lead !== null && <SeatAvatar seat={order.lead} size={QUIZMASTER_AVATAR} />}

                <LeadLine line={leadTemplate} name={leadName} styles={styles} />

                <View style={styles.push}>
                    <QuestionCount number={order.number} total={order.total} />
                </View>
            </View>

            <View style={styles.hairline} />

            <View style={styles.row}>
                {walking && <AppText style={styles.title}>{t('pubquizr.board.turnOrder.title')}</AppText>}

                <AppText style={styles.status} numberOfLines={1}>{status}</AppText>

                {walking && leading && <Chip text={order.count} styles={styles} />}
            </View>

            {walking && (
                <View style={styles.bleed}>
                    {/* Centred while it fits, and scrolled sideways once it does not. */}
                    <ScrollView
                        ref={scroller}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.path}
                        onLayout={event => setViewWidth(event.nativeEvent.layout.width)}
                        onContentSizeChange={width => setContentWidth(width)}
                    >
                        {order.path.map((seat, index) => {
                            const now = seat.seat === order.current;
                            const mine = seat.seat === mySeat;
                            const shadows = [now && lift, mine && ring].filter(Boolean).join(', ');

                            return (
                                <Fragment key={seat.seat}>
                                    {index > 0 && (
                                        <View style={styles.chevron}>
                                            <Feather name="chevron-right" size={CHEVRON} color={theme.colors.textFaint} />
                                        </View>
                                    )}

                                    <View onLayout={event => stops.current.set(seat.seat, event.nativeEvent.layout.x)}>
                                        {/* Keyed on the seat's `now` status, so the marker visibly lifts as the turn walks onto it. */}
                                        <SlideFadeIn
                                            style={styles.column}
                                            offsetY={-6}
                                            durationMs={220}
                                            replayKey={`${seat.seat}-${now}`}
                                        >
                                            <View style={styles.slot}>
                                                <SeatAvatar
                                                    seat={seat}
                                                    size={now ? CURRENT_AVATAR : SEAT_AVATAR}
                                                    style={{
                                                        ...(now && { borderWidth: CURRENT_BORDER }),
                                                        ...(shadows !== '' && { boxShadow: shadows })
                                                    }}
                                                />
                                            </View>

                                            <AppText
                                                style={[styles.name, (now || mine) && styles.nameStrong]}
                                                numberOfLines={1}
                                            >
                                                {nameOf(seat)}
                                            </AppText>
                                        </SlideFadeIn>
                                    </View>
                                </Fragment>
                            )
                        })}
                    </ScrollView>

                    {overflowing && (
                        <View style={[styles.fade, washToRight(theme.colors.backgroundSecondary)]} pointerEvents="none" />
                    )}
                </View>
            )}
        </View>
    )
}

// "Joep, Tess and Fleur", without leaning on `Intl.ListFormat`.
function listOf(names: string[], and: string): string {
    if (names.length < 2) return names.join('');

    return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

interface LeadLineProps {
    line: string
    name: string | null
    styles: ReturnType<typeof useStyles>
}

function LeadLine({ line, name, styles }: LeadLineProps) {
    const [before, rest] = name === null ? [line, undefined] : line.split(NAME_MARK);

    return (
        <AppText style={styles.lead} numberOfLines={1}>
            {before}
            {name !== null && rest !== undefined && <AppText style={styles.leadName}>{name}</AppText>}
            {rest}
        </AppText>
    )
}

function Chip({ text, styles }: { text: string, styles: ReturnType<typeof useStyles> }) {
    return (
        <View style={styles.chip}>
            <AppText style={styles.chipText} numberOfLines={1}>{text}</AppText>
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
        ...theme.shadows.hardSmall
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    lead: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    leadName: {
        fontWeight: 900,
        color: theme.colors.text
    },

    hairline: {
        height: HAIRLINE,
        backgroundColor: theme.colors.borderMuted
    },

    title: {
        flexShrink: 0,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    },

    status: {
        flex: 1,
        minWidth: 0,
        fontSize: NAME_SIZE,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    push: {
        flexShrink: 0,
        marginLeft: 'auto'
    },

    chip: {
        flexShrink: 0,
        marginLeft: 'auto',
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.half,
        borderRadius: Radii.full,
        borderWidth: HAIRLINE,
        borderColor: theme.colors.borderMuted
    },

    chipText: {
        fontSize: CHIP_SIZE,
        fontWeight: 900,
        color: theme.colors.textMuted
    },

    // Out to the card's inner edge, so the row scrolls under the border rather than stopping short of it.
    bleed: {
        marginHorizontal: -Spacing.two
    },

    path: {
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: Spacing.half,
        paddingHorizontal: Spacing.two
    },

    column: {
        width: COLUMN,
        alignItems: 'center',
        gap: Spacing.one
    },

    slot: {
        height: AVATAR_SLOT,
        justifyContent: 'center'
    },

    // As tall as the avatar slot, so the chevron points from centre to centre rather than at the names.
    chevron: {
        height: AVATAR_SLOT,
        justifyContent: 'center'
    },

    name: {
        maxWidth: COLUMN,
        fontSize: NAME_SIZE,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    nameStrong: {
        fontWeight: 900,
        color: theme.colors.text
    },

    fade: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: FADE
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
        fontSize: CHIP_SIZE,
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
