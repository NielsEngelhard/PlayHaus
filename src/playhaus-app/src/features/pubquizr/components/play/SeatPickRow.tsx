import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import PopPressable from "@/components/ui/PopPressable";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useDragScroll } from "@/components/ui/useDragScroll";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Animated, Platform, Pressable, View } from "react-native";

// Clears the 18dp badge out to a 42dp target.
const BADGE_SLOP = { top: 12, right: 12, bottom: 12, left: 12 };

const useNativeDriver = Platform.OS !== 'web';

const MAX_VISIBLE = 5;
// A half chip cut off at the edge is what says the row scrolls.
const VISIBLE_WHEN_SCROLLING = 4.5;
const GAP = 7;
const SCROLLBAR_HEIGHT = 3;
// How far the badge hangs past the chip's top and right edges.
const BADGE_OVERHANG = 5;
const SHADOW_REACH = 3;

interface Props {
    // "Nobody got it" has been tapped once and is waiting for the confirm tap.
    confirmingNobody: boolean
    // The answer is still covered, which is the reason the row is locked.
    covered: boolean
    // Until the answer is showing, or while a ruling is in the air.
    locked: boolean
    onConfirmNobody: () => void
    onLockIn: () => void
    onNobody: () => void
    onPick: (seat: number) => void
    onToggleOut: (seat: number) => void
    // The seat named as having got it, waiting for the lock-in.
    picked: number | null
    // Everybody the question can still go to, in the order it would reach them.
    remaining: Seat[]
    ruledOut: number[]
}

// One chip per seat still in: tap a body to name who got it, tap a badge to rule that seat out.
export default function SeatPickRow({
    confirmingNobody,
    covered,
    locked,
    onConfirmNobody,
    onLockIn,
    onNobody,
    onPick,
    onToggleOut,
    picked,
    remaining,
    ruledOut
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const pickedAt = picked === null ? -1 : remaining.findIndex(seat => seat.seat === picked);
    const pickedSeat = pickedAt < 0 ? null : remaining[pickedAt];

    // Out by badge, or out because they sit ahead of the seat that was picked.
    const isOut = (seat: number, index: number) => ruledOut.includes(seat) || (pickedAt >= 0 && index < pickedAt);

    const firstOut = remaining.find(seat => ruledOut.includes(seat.seat)) ?? null;

    const hint = locked && covered
        ? t('pubquizr.play.validateLocked')
        : pickedSeat !== null
            ? t('pubquizr.play.pickLockHint', { name: pickedSeat.name })
            : confirmingNobody
                ? t('pubquizr.play.nobodyConfirmHint')
                : firstOut !== null
                    ? t('pubquizr.play.pickUndoHint', { name: firstOut.name })
                    : t('pubquizr.play.pickHint');

    // 1-based places among the seats still in, renumbered only once a seat is actually ruled out —
    // an unconfirmed pick must not shift anyone else's badge.
    const positions = remaining.reduce<number[]>((acc, seat) => {
        const previous = acc.length === 0 ? 0 : Math.max(...acc);
        return [...acc, ruledOut.includes(seat.seat) ? 0 : previous + 1];
    }, []);

    const [width, setWidth] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [scrollX] = useState(() => new Animated.Value(0));
    const dragScroll = useDragScroll();
    const scrolls = remaining.length > MAX_VISIBLE;
    const slotWidth = (width - GAP * Math.floor(VISIBLE_WHEN_SCROLLING)) / VISIBLE_WHEN_SCROLLING;

    const showScrollbar = scrolls && width > 0 && contentWidth > width;
    const thumbWidth = showScrollbar ? width * width / contentWidth : 0;
    const thumbX = scrollX.interpolate({
        inputRange: [0, Math.max(1, contentWidth - width)],
        outputRange: [0, Math.max(0, width - thumbWidth)],
        extrapolate: 'clamp'
    });

    const chips = remaining.map((seat, index) => {
        const out = isOut(seat.seat, index);
        const chosen = seat.seat === picked;
        const ruled = ruledOut.includes(seat.seat);

        return (
            <View key={seat.seat} style={[scrolls ? { width: slotWidth } : styles.slot, out && styles.dimmed]}>
                <PopPressable
                    onPress={() => onPick(seat.seat)}
                    disabled={locked}
                    accessibilityRole="button"
                    accessibilityLabel={t('pubquizr.play.pickSpoken', { name: seat.name })}
                    accessibilityState={{ disabled: locked, selected: chosen }}
                    style={[styles.chip, out ? styles.chipOut : styles.chipIn, chosen && styles.chipPicked]}
                >
                    <SeatAvatar seat={seat} size={28} />

                    <AppText style={[styles.name, chosen && styles.nameOnMint]} numberOfLines={1}>{seat.name}</AppText>
                </PopPressable>

                {/* A sibling of the body rather than its child, so a tap on it never also counts as a pick. */}
                <Pressable
                    onPress={() => onToggleOut(seat.seat)}
                    disabled={locked}
                    hitSlop={BADGE_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={ruled
                        ? t('pubquizr.play.ruleInSpoken', { name: seat.name })
                        : t('pubquizr.play.ruleOutSpoken', { name: seat.name })}
                    accessibilityState={{ disabled: locked }}
                    style={[styles.badge, ruled && styles.badgeOut]}
                >
                    {ruled ? (
                        <Feather name="x" size={9} color={Brand.ink} />
                    ) : (
                        <AppText style={styles.badgeText}>{positions[index]}</AppText>
                    )}
                </Pressable>
            </View>
        );
    });

    return (
        <View style={styles.block} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
            {scrolls ? (
                <>
                    <Animated.ScrollView
                        ref={dragScroll}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        onContentSizeChange={contentW => setContentWidth(contentW)}
                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver })}
                        scrollEventThrottle={16}
                        style={[styles.scroller, covered && styles.dimmed]}
                        contentContainerStyle={styles.scrollRow}
                    >
                        {width > 0 && chips}
                    </Animated.ScrollView>

                    {/* Drawn rather than native, since the platform indicators only show mid-scroll. */}
                    {showScrollbar && (
                        <View style={[styles.track, covered && styles.dimmed]}>
                            <Animated.View style={[styles.thumb, { width: thumbWidth, transform: [{ translateX: thumbX }] }]} />
                        </View>
                    )}
                </>
            ) : (
                <View style={[styles.row, covered && styles.dimmed]}>
                    {chips}
                </View>
            )}

            {pickedSeat !== null ? (
                <PopPressable
                    onPress={onLockIn}
                    disabled={locked}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: locked }}
                    style={[styles.lockIn, locked && styles.dimmed]}
                >
                    <Feather name="check" size={16} color={Brand.ink} />

                    <AppText style={styles.lockInLabel} numberOfLines={1}>
                        {t('pubquizr.play.lockIn')}
                    </AppText>
                </PopPressable>
            ) : confirmingNobody ? (
                <PopPressable
                    onPress={onConfirmNobody}
                    disabled={locked}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: locked }}
                    style={[styles.lockIn, locked && styles.dimmed]}
                >
                    <Feather name="arrow-right" size={16} color={Brand.ink} />

                    <AppText style={styles.lockInLabel} numberOfLines={1}>
                        {t('pubquizr.play.nobodyConfirm')}
                    </AppText>
                </PopPressable>
            ) : (
                <Pressable
                    onPress={onNobody}
                    disabled={locked}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: locked }}
                    style={[styles.nobody, locked && styles.dimmed]}
                >
                    <Feather name="x" size={14} color={theme.colors.textMuted} />

                    <AppText style={styles.nobodyLabel}>{t('pubquizr.play.nobodyGotIt')}</AppText>
                </Pressable>
            )}

            <TextHint text={hint} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    block: {
        flexShrink: 0,
        gap: 8
    },

    row: {
        flexDirection: 'row',
        gap: GAP
    },

    // Pulled back over the padding below, so the row sits where the unscrolled one would.
    scroller: {
        marginTop: -BADGE_OVERHANG,
        marginBottom: -SHADOW_REACH
    },

    // Room for the badge and the picked chip's shadow, which the scroller would otherwise clip.
    scrollRow: {
        gap: GAP,
        paddingTop: BADGE_OVERHANG,
        paddingRight: BADGE_OVERHANG,
        paddingBottom: SHADOW_REACH
    },

    track: {
        height: SCROLLBAR_HEIGHT,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: theme.colors.borderDashed
    },

    thumb: {
        height: SCROLLBAR_HEIGHT,
        borderRadius: 999,
        backgroundColor: theme.colors.textMuted
    },

    dimmed: {
        opacity: 0.5
    },

    slot: {
        flex: 1,
        minWidth: 0
    },

    chip: {
        height: 74,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 4,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },

    chipIn: {
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    // The canvas and no shadow: sunk back into the page.
    chipOut: {
        backgroundColor: theme.colors.background
    },

    // Mint, the same "yes, this one" the right option wears.
    chipPicked: {
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hard
    },

    name: {
        maxWidth: '100%',
        fontSize: 11.5,
        fontWeight: 900,
        color: theme.colors.text
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    nameOnMint: {
        color: Brand.ink
    },

    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    // Fog in both schemes, like the lemon it replaces, so the ink cross reads on either.
    badgeOut: {
        backgroundColor: Brand.fog
    },

    badgeText: {
        fontSize: 9.5,
        fontWeight: 900,
        color: Brand.ink
    },

    nobody: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed
    },

    nobodyLabel: {
        fontSize: 13,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    // Lemon, the house colour for the one step that commits.
    lockIn: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon,
        ...theme.shadows.hard
    },

    // Ink on lemon in both schemes, because the fill is lemon in both.
    lockInLabel: {
        flexShrink: 1,
        fontSize: 14,
        fontWeight: 900,
        color: Brand.ink
    }
}))
