import AppText from "@/components/text/AppText";
import { fontFamilyForWeight, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { colorForSeat } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

interface Props {
    names: string[]
    minPlayers: number
    maxPlayers: number
    onChange: (names: string[]) => void
    disabled?: boolean
}

const BADGE_SIZE = 30;

export default function PlayerNamesInput({ names, onChange, minPlayers, maxPlayers, disabled = false }: Props) {
    const t = useT();
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

    /*
     * Which seat is being typed into, so the field can trade its shadow for a halo.
     *
     * React Native has no `:focus`, and the swap is not something a style can express on
     * its own — a focused field puts its hard shadow *down* and lights a ring instead, so
     * exactly one of the two has to be live at a time and the component has to know which
     * one that is.
     */
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
            {names.map((name, seat) => {
                const swatch = colorForSeat(seat);

                return (
                    <View key={seat} style={styles.seat}>
                        <View style={[styles.badge, { backgroundColor: swatch.color }]}>
                            <AppText style={[styles.badgeText, { color: swatch.foreground }]}>
                                {seat + 1}
                            </AppText>
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
                            style={[styles.input, focused === seat && styles.inputFocused, disabled && styles.dimmed]}
                        />

                        {removable && (
                            <Pressable
                                onPress={() => remove(seat)}
                                disabled={disabled}
                                accessibilityRole="button"
                                accessibilityLabel={t('common.player.remove', { seat: seat + 1 })}
                                accessibilityState={{ disabled }}
                                style={[styles.remove, disabled && styles.dimmed]}
                            >
                                <Feather name="x" size={16} color={theme.colors.textFaint} />
                            </Pressable>
                        )}
                    </View>
                )
            })}

            <View style={styles.footer}>
                <Pressable
                    onPress={add}
                    disabled={disabled || full}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: disabled || full }}
                    style={[styles.add, (disabled || full) && styles.dimmed]}
                >
                    <View style={styles.addDisc}>
                        <Feather name="plus" size={12} color={theme.colors.text} />
                    </View>

                    <AppText style={styles.addText}>
                        {t('common.player.add')}
                    </AppText>
                </Pressable>

                <AppText style={styles.count}>
                    {names.length} / {maxPlayers}
                </AppText>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        gap: 9
    },

    seat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9
    },

    badge: {
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        // A swatch is a colour rather than a surface, so light cuts it out of the page
        // with the same ink line every other object on it wears and dark leaves it to
        // carry itself — the same trade `QuizRow` makes for its avatar.
        ...(theme.scheme === 'dark'
            ? {}
            : { borderWidth: theme.borderWidth, borderColor: theme.colors.border })
    },

    badgeText: {
        fontSize: 13,
        fontWeight: 900
    },

    // The chrome `TextField` wears, minus its label: the seat number to the left already
    // says which field this is, and a stack of eight uppercase micro-labels would be the
    // loudest thing on the page.
    //
    // An inked slab sitting *on* the sheet rather than a well sunk into it, which is why
    // the fill is `backgroundSecondary` and not `backgroundInput`: the hard shadow is what
    // makes the field an object you can put a finger on, and a surface throwing one has to
    // be lighter than the paper it throws it onto.
    input: {
        flex: 1,
        minWidth: 0,
        height: 46,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        backgroundColor: theme.colors.backgroundSecondary,
        paddingHorizontal: Spacing.three,
        fontSize: 15,
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(700),
        color: theme.colors.text,
        // Written out rather than taken from `theme.shadows`, which is typed as a
        // `ViewStyle`: spreading one into a `TextInput`'s sheet widens the entry past what
        // a text style may hold. Same offset, same ink — see `hardShadow`.
        boxShadow: `3px 3px 0 0 ${theme.colors.shadow}`
    },

    // Typing presses the field down: the offset shadow goes and a halo comes up in its
    // place. One `boxShadow` overwriting another, so this has to be applied *after*
    // `input` in the style array — there is nothing to spread conditionally.
    inputFocused: {
        boxShadow: `0 0 0 4px ${theme.colors.focusRing}`
    },

    remove: {
        width: 30,
        height: 30,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },

    footer: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },

    add: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: Spacing.one,
        // Indented by the badge column so the label starts where the names do, which is
        // what makes it read as one more seat rather than as a button.
        paddingLeft: BADGE_SIZE + 9
    },

    // A small inked disc, in the same hand as the fields above it — the row reads as one
    // more seat you can stamp into being. The affordance is the disc, so the words next to
    // it go back to being words rather than the one coloured thing in the block.
    addDisc: {
        width: 22,
        height: 22,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    addText: {
        fontSize: 12.5,
        fontWeight: 900,
        color: theme.colors.text
    },

    count: {
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
