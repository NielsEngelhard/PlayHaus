import AppText from "@/components/text/AppText";
import { fontFamilyForWeight, withAlpha } from "@/constants/theme";
import type { Phrase } from "@/features/i18n/keys";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { colorForSeat } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";

interface Props {
    names: string[]
    minPlayers: number
    maxPlayers: number
    onChange: (names: string[]) => void
    disabled?: boolean
}

// Turn order runs seat + 1, and the quizmaster reads to the seat on their left, so each seat sits left of the one before it.
function captionFor(names: string[], seat: number): Phrase {
    if (seat === 0) return { key: 'pubquizr.oneDevice.seat.first' };

    const previous = names[seat - 1]?.trim() ?? '';

    return previous === ''
        ? { key: 'pubquizr.oneDevice.seat.fallback', values: { seat } }
        : { key: 'pubquizr.oneDevice.seat.leftOf', values: { name: previous } };
}

export default function PlayerNamesInputInOrder({ names, onChange, minPlayers, maxPlayers, disabled = false }: Props) {
    const t = useT();
    const phrase = usePhrase();
    const theme = useTheme();
    const styles = useStyles();

    const removable = names.length > minPlayers;
    const full = names.length >= maxPlayers;

    useEffect(() => {
        if (names.length < minPlayers) {
            onChange([
                ...names,
                ...Array.from({ length: minPlayers - names.length }, () => ''),
            ]);
        }
    }, [names, minPlayers, onChange]);

    const [focused, setFocused] = useState<number | null>(null);

    const inputs = useRef<(TextInput | null)[]>([]);

    // The seat "Volgende stoel" just added, focused once its input has mounted.
    const pendingFocus = useRef<number | null>(null);
    useEffect(() => {
        if (pendingFocus.current === null) return;

        inputs.current[pendingFocus.current]?.focus();
        pendingFocus.current = null;
    }, [names.length]);

    function rename(seat: number, name: string) {
        onChange(names.map((current, index) => index === seat ? name : current));
    }

    function remove(seat: number) {
        onChange(names.filter((_, index) => index !== seat));
    }

    function add() {
        if (full) return;

        pendingFocus.current = names.length;
        onChange([...names, '']);
    }

    function submit(seat: number) {
        if (seat < names.length - 1) {
            inputs.current[seat + 1]?.focus();
        } else {
            Keyboard.dismiss();
        }
    }

    return (
        <View style={[styles.card, disabled && styles.dimmed]}>
            {names.map((name, seat) => {
                const swatch = colorForSeat(seat);
                const last = seat === names.length - 1;
                const isFocused = focused === seat;

                return (
                    <View
                        key={seat}
                        style={[styles.row, (!last || !full) && styles.rowDivided, isFocused && styles.rowFocused]}
                    >
                        <View style={[styles.badge, { backgroundColor: swatch.color }]}>
                            <AppText style={[styles.badgeText, { color: swatch.foreground }]}>
                                {seat + 1}
                            </AppText>
                        </View>

                        <View style={styles.lines}>
                            <AppText numberOfLines={1} style={[styles.caption, isFocused && styles.captionFocused]}>
                                {phrase(captionFor(names, seat))}
                            </AppText>

                            <TextInput
                                ref={input => { inputs.current[seat] = input; }}
                                value={name}
                                onChangeText={value => rename(seat, value)}
                                onFocus={() => setFocused(seat)}
                                onBlur={() => setFocused(current => current === seat ? null : current)}
                                onSubmitEditing={() => submit(seat)}
                                placeholder={t('pubquizr.oneDevice.seat.placeholder')}
                                placeholderTextColor={theme.colors.textFaint}
                                autoCapitalize="words"
                                autoCorrect={false}
                                returnKeyType={last ? 'done' : 'next'}
                                submitBehavior={last ? 'blurAndSubmit' : 'submit'}
                                editable={!disabled}
                                accessibilityLabel={t('pubquizr.oneDevice.players.seat', { seat: seat + 1 })}
                                style={styles.input}
                            />
                        </View>

                        {removable && (
                            <Pressable
                                onPress={() => remove(seat)}
                                disabled={disabled}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel={t('common.player.remove', { seat: seat + 1 })}
                                accessibilityState={{ disabled }}
                                style={styles.remove}
                            >
                                <Feather name="x" size={15} color={theme.colors.textFaint} />
                            </Pressable>
                        )}
                    </View>
                )
            })}

            {!full && (
                <Pressable
                    onPress={add}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={t('pubquizr.oneDevice.seat.add')}
                    accessibilityState={{ disabled }}
                    style={styles.addRow}
                >
                    <View style={styles.addIcon}>
                        <Feather name="plus" size={12} color={theme.colors.text} />
                    </View>

                    <AppText style={styles.addText}>
                        {t('pubquizr.oneDevice.seat.add')}
                    </AppText>

                    <AppText style={styles.count}>
                        {names.length} / {maxPlayers}
                    </AppText>
                </Pressable>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        width: '100%',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        borderRadius: 18,
        backgroundColor: theme.colors.backgroundSecondary,
        boxShadow: `4px 4px 0 0 ${theme.colors.shadow}`,
        overflow: 'hidden'
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: 12
    },

    // Dark mode's border is already a quiet grey, so it is used as-is rather than faded out of sight.
    rowDivided: {
        borderBottomWidth: 1.5,
        borderBottomColor: theme.scheme === 'dark'
            ? theme.colors.border
            : withAlpha(theme.colors.border, 0.12)
    },

    // Inset, because a drop shadow on a flush row inside a fenced card has nowhere to fall.
    rowFocused: {
        boxShadow: `inset 0 0 0 3px ${theme.colors.focusRing}`
    },

    badge: {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center'
    },

    badgeText: {
        fontSize: 11.5,
        fontWeight: 900
    },

    lines: {
        flex: 1,
        minWidth: 0,
        gap: 1
    },

    caption: {
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },

    captionFocused: {
        color: theme.colors.focus
    },

    // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
    input: {
        minWidth: 0,
        padding: 0,
        borderWidth: 0,
        backgroundColor: 'transparent',
        fontSize: 15,
        fontFamily: fontFamilyForWeight(700),
        color: theme.colors.text
    },

    remove: {
        width: 20,
        height: 20,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },

    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.background
    },

    addIcon: {
        width: 22,
        height: 22,
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `2px 2px 0 0 ${theme.colors.shadow}`
    },

    addText: {
        flex: 1,
        fontSize: 12.5,
        fontWeight: 900,
        color: theme.colors.text
    },

    count: {
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 1.2,
        color: theme.colors.textSecondary
    },

    dimmed: {
        opacity: 0.5
    }
}))
