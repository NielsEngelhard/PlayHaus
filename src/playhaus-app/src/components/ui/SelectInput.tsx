import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export interface SelectOption<T extends string> {
    value: T,
    label: string,
    /** Optional second line. Shown in the open list only — the field stays one line. */
    description?: string
}

interface Props<T extends string> {
    label: string,
    value: T,
    options: readonly SelectOption<T>[],
    onChange: (value: T) => void
}

/**
 * Pick one of a list. Collapsed to a single field until it's tapped, so a card carrying
 * one of these keeps its height however many options there are.
 */
export default function SelectInput<T extends string>({ label, value, options, onChange }: Props<T>) {
    const [open, setOpen] = useState(false);

    const selected = options.find(option => option.value === value);

    function choose(option: SelectOption<T>) {
        onChange(option.value);
        setOpen(false);
    }

    return (
        <Card>
            <AppText style={styles.label}>{label}</AppText>

            <Pressable
                onPress={() => setOpen(current => !current)}
                accessibilityRole='button'
                accessibilityLabel={`${label}: ${selected?.label ?? 'niets gekozen'}`}
                // `aria-expanded` rather than `accessibilityState={{ expanded }}`: the
                // latter never reaches the DOM in this version, so the field would open
                // without announcing that it had.
                aria-expanded={open}
                style={styles.field}
            >
                {/* A value with no matching option means the caller and the list are out of
                    step. Show an em dash rather than an empty field or a crash. */}
                <AppText style={styles.fieldText}>{selected?.label ?? '—'}</AppText>

                <Feather
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.light.text}
                />
            </Pressable>

            {open && (
                <View style={styles.options}>
                    {options.map((option, index) => (
                        <OptionRow
                            key={option.value}
                            option={option}
                            selected={option.value === value}
                            divided={index > 0}
                            onPress={() => choose(option)}
                        />
                    ))}
                </View>
            )}
        </Card>
    )
}

interface OptionRowProps<T extends string> {
    option: SelectOption<T>,
    selected: boolean,
    /** Every row but the first wears the divider above it. */
    divided: boolean,
    onPress: () => void
}

function OptionRow<T extends string>({ option, selected, divided, onPress }: OptionRowProps<T>) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='radio'
            accessibilityLabel={option.label}
            // Same reason as the field above: `accessibilityState={{ checked }}` would
            // leave the chosen row looking selected but not announcing as selected.
            aria-checked={selected}
            style={[styles.row, divided && styles.rowDivided]}
        >
            <View style={styles.rowText}>
                <AppText style={styles.rowTitle}>{option.label}</AppText>

                {option.description && (
                    <AppText style={styles.rowDescription}>{option.description}</AppText>
                )}
            </View>

            <View style={[styles.check, selected ? styles.checkOn : styles.checkOff]}>
                {selected && (
                    <Feather name='check' size={16} color={Colors.light.textOnAccent} />
                )}
            </View>
        </Pressable>
    )
}

const CHECK_SIZE = 28;

const styles = StyleSheet.create({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    },
    // Sunken, the way a text input reads — this is somewhere you put a value, not a
    // button that does something.
    field: {
        marginTop: Spacing.three,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
        backgroundColor: Colors.light.backgroundInput,
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        ...Shadows.hardSmall
    },
    fieldText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.md,
        fontWeight: 700,
        color: Colors.light.text
    },
    // The list pushes the page down rather than floating over it: an overlay would have
    // to win a stacking fight with whatever card comes next.
    options: {
        marginTop: Spacing.two
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingVertical: Spacing.three
    },
    // Only between rows — the card's own padding does the work at the two ends.
    rowDivided: {
        borderTopWidth: 2,
        borderTopColor: Colors.light.border
    },
    rowText: {
        flex: 1,
        minWidth: 0
    },
    rowTitle: {
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.2,
        fontWeight: 700,
        color: Colors.light.text
    },
    rowDescription: {
        marginTop: Spacing.half,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.4,
        color: Colors.light.textSecondary
    },
    check: {
        width: CHECK_SIZE,
        height: CHECK_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 999
    },
    checkOn: {
        backgroundColor: Colors.light.primary
    },
    checkOff: {
        backgroundColor: Colors.light.muted
    }
})
