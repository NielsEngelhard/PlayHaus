import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import { fontFamilyForWeight } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { colorForSeat } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";

interface Props {
    names: string[]
    minPlayers: number
    maxPlayers: number
    onChange: (names: string[]) => void
    disabled?: boolean
}

const BADGE_SIZE = 22;

export default function PlayerNamesInput({ names, onChange, minPlayers, maxPlayers, disabled = false }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const addPop = usePressPop();

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

    // Which seat is being typed into, so the card can trade its shadow for a halo.
    const [focused, setFocused] = useState<number | null>(null);

    function rename(seat: number, name: string) {
        onChange(names.map((current, index) => index === seat ? name : current));
    }


    function remove(seat: number) {
        onChange(names.filter((_, index) => index !== seat));
    }

    function add() {
        if (full) return;

        onChange([...names, '']);
    }

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {names.map((name, seat) => {
                    const swatch = colorForSeat(seat);

                    return (
                        <View
                            key={seat}
                            style={[styles.card, focused === seat && styles.cardFocused, disabled && styles.dimmed]}
                        >
                            <View style={styles.cardHeader}>
                                <View style={[styles.badge, { backgroundColor: swatch.color }]}>
                                    <AppText style={[styles.badgeText, { color: swatch.foreground }]}>
                                        {seat + 1}
                                    </AppText>
                                </View>

                                {removable && (
                                    <RemoveButton
                                        onPress={() => remove(seat)}
                                        disabled={disabled}
                                        label={t('common.player.remove', { seat: seat + 1 })}
                                    />
                                )}
                            </View>

                            <TextInput
                                value={name}
                                onChangeText={value => rename(seat, value)}
                                onFocus={() => setFocused(seat)}
                                onBlur={() => setFocused(current => current === seat ? null : current)}
                                placeholder={t('common.player.namePlaceholder')}
                                placeholderTextColor={theme.colors.textFaint}
                                autoCapitalize="words"
                                autoCorrect={false}
                                returnKeyType="next"
                                editable={!disabled}
                                accessibilityLabel={t('pubquizr.oneDevice.players.seat', { seat: seat + 1 })}
                                style={styles.input}
                            />
                        </View>
                    )
                })}

                <AnimatedPressable
                    onPress={add}
                    disabled={disabled || full}
                    onPressIn={addPop.onPressIn}
                    onPressOut={addPop.onPressOut}
                    onHoverIn={addPop.onHoverIn}
                    onHoverOut={addPop.onHoverOut}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.player.add')}
                    accessibilityState={{ disabled: disabled || full }}
                    style={[styles.addCard, (disabled || full) && styles.dimmed, addPop.animatedStyle]}
                >
                    <Feather name="plus" size={16} color={theme.colors.textSecondary} />

                    <AppText style={styles.addText}>
                        {t('common.player.add')}
                    </AppText>
                </AnimatedPressable>
            </View>

            <AppText style={styles.count}>
                {names.length} / {maxPlayers}
            </AppText>
        </View>
    )
}

interface RemoveButtonProps {
    onPress: () => void
    disabled: boolean
    label: string
}

function RemoveButton({ onPress, disabled, label }: RemoveButtonProps) {
    const theme = useTheme();
    const styles = useStyles();
    const pop = usePressPop();

    return (
        <AnimatedPressable
            onPress={onPress}
            disabled={disabled}
            onPressIn={pop.onPressIn}
            onPressOut={pop.onPressOut}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            style={[styles.remove, pop.animatedStyle]}
        >
            <Feather name="x" size={13} color={theme.colors.textFaint} />
        </AnimatedPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        gap: 9
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 9
    },

    card: {
        width: '48%',
        height: 70,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        borderRadius: 14,
        backgroundColor: theme.colors.backgroundSecondary,
        paddingHorizontal: 10,
        paddingVertical: 8,
        justifyContent: 'space-between',
        // Written out rather than taken from `theme.shadows`, which is typed as a `ViewStyle`.
        boxShadow: `3px 3px 0 0 ${theme.colors.shadow}`
    },

    // Typing presses the card down: the offset shadow goes and a halo comes up in its place.
    cardFocused: {
        boxShadow: `0 0 0 4px ${theme.colors.focusRing}`
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },

    badge: {
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        // A swatch is a colour rather than a surface.
        ...(theme.scheme === 'dark'
            ? {}
            : { borderWidth: 1.5, borderColor: theme.colors.border })
    },

    badgeText: {
        fontSize: 10,
        fontWeight: 900
    },

    remove: {
        width: 20,
        height: 20,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },

    // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
    input: {
        minWidth: 0,
        padding: 0,
        fontSize: 15,
        letterSpacing: -0.2,
        fontFamily: fontFamilyForWeight(800),
        color: theme.colors.text
    },

    addCard: {
        width: '48%',
        height: 70,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        borderRadius: 14,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4
    },

    addText: {
        fontSize: 11,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },

    count: {
        alignSelf: 'flex-end',
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 1.2,
        color: theme.colors.textMuted
    },

    // The same half-strength every other blocked control in the app wears.
    dimmed: {
        opacity: 0.5
    }
}))
