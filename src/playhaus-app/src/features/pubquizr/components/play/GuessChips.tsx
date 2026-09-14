import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT, useUiLanguage } from "@/features/i18n/LanguageContext";
import { compactNumber } from "@/features/pubquizr/round-three";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";

interface Props {
    busy: boolean
    clashing: number[]
    focused: number | null
    guessing: Seat[]
    onFocus: (seat: number) => void
    typed: Record<number, string>
}

// One badge per guesser; tapping any of them puts the pad back on that player.
export default function GuessChips({ busy, clashing, focused, guessing, onFocus, typed }: Props) {
    const t = useT();
    const language = useUiLanguage();
    const styles = useStyles();

    const scroller = useRef<ScrollView>(null);
    const offsets = useRef<Record<number, number>>({});

    const index = guessing.findIndex(seat => seat.seat === focused);

    useEffect(() => {
        if (focused === null) return;
        const x = offsets.current[focused];
        if (x !== undefined) scroller.current?.scrollTo({ x: Math.max(0, x - 40), animated: true });
    }, [focused]);

    return (
        <View style={styles.row}>
            <ScrollView
                ref={scroller}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scroller}
                contentContainerStyle={styles.chips}
            >
                {guessing.map(seat => {
                    const text = (typed[seat.seat] ?? '').trim();
                    const value = Number(text);
                    const current = seat.seat === focused;
                    const clash = clashing.includes(seat.seat);

                    return (
                        <Pressable
                            key={seat.seat}
                            onPress={() => onFocus(seat.seat)}
                            onLayout={event => { offsets.current[seat.seat] = event.nativeEvent.layout.x; }}
                            disabled={busy}
                            hitSlop={4}
                            accessibilityRole="button"
                            accessibilityState={{ selected: current }}
                            accessibilityLabel={t('pubquizr.play.closest.entry', { name: seat.name })}
                        >
                            {current || text !== '' ? (
                                <View style={[styles.chip, current && styles.chipCurrent, clash && styles.chipClash]}>
                                    <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
                                        <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                                            {seat.initials}
                                        </AppText>
                                    </View>

                                    <AppText style={[styles.value, current && styles.valueCurrent]}>
                                        {current
                                            ? t('pubquizr.play.closest.now')
                                            : Number.isFinite(value) ? compactNumber(value, language) : text}
                                    </AppText>
                                </View>
                            ) : (
                                <View style={[styles.empty, clash && styles.chipClash]}>
                                    <AppText style={styles.emptyInitials}>{seat.initials}</AppText>
                                </View>
                            )}
                        </Pressable>
                    )
                })}
            </ScrollView>

            <AppText style={styles.position}>
                {t('pubquizr.play.closest.position', { number: index + 1, total: guessing.length })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    scroller: {
        flex: 1,
        minWidth: 0
    },

    // Vertical room for the focus ring, which a scroller would otherwise clip.
    chips: {
        alignItems: 'center',
        gap: 7,
        paddingVertical: 5,
        paddingHorizontal: 5
    },

    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 3,
        paddingLeft: 3,
        paddingRight: 9,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    chipCurrent: {
        borderColor: theme.colors.focus,
        boxShadow: `0 0 0 4px ${theme.colors.focusRing}`
    },

    // After the focus ring, so a clash on the current player still shows.
    chipClash: {
        borderColor: theme.colors.destructive
    },

    avatar: {
        width: 22,
        height: 22,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 8.5,
        fontWeight: 900
    },

    value: {
        fontSize: 12,
        fontWeight: 900,
        color: theme.colors.text
    },

    valueCurrent: {
        color: theme.colors.focus
    },

    empty: {
        width: 22,
        height: 22,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderMuted
    },

    emptyInitials: {
        fontSize: 8,
        fontWeight: 900,
        color: theme.colors.textFaint
    },

    position: {
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 800,
        color: theme.colors.textMuted
    }
}))
