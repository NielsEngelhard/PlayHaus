import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { LANGUAGES, type Language, type LanguageCode } from "@/features/league-of-letters/solo-settings";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    value: LanguageCode,
    onChange: (language: LanguageCode) => void
}

/**
 * Which word list to play from. A row list rather than tiles: the options are words,
 * not numbers, and it keeps its shape when a third language shows up.
 */
export default function LanguageCard({ value, onChange }: Props) {
    return (
        <Card>
            <AppText style={styles.label}>Taal</AppText>

            <View style={styles.rows}>
                {LANGUAGES.map((language, index) => (
                    <LanguageRow
                        key={language.code}
                        language={language}
                        selected={language.code === value}
                        divided={index > 0}
                        onPress={() => onChange(language.code)}
                    />
                ))}
            </View>
        </Card>
    )
}

interface LanguageRowProps {
    language: Language,
    selected: boolean,
    /** Every row but the first wears the divider above it. */
    divided: boolean,
    onPress: () => void
}

function LanguageRow({ language, selected, divided, onPress }: LanguageRowProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='radio'
            accessibilityLabel={language.label}
            // `aria-checked` rather than `accessibilityState={{ checked }}`: the latter
            // never reaches the DOM in this version, so the chosen row would look
            // selected but not announce as selected.
            aria-checked={selected}
            style={[styles.row, divided && styles.rowDivided]}
        >
            <View style={styles.text}>
                <AppText style={styles.title}>{language.label}</AppText>
                <AppText style={styles.description}>{language.description}</AppText>
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
    rows: {
        marginTop: Spacing.three
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
    text: {
        flex: 1,
        minWidth: 0
    },
    title: {
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.2,
        fontWeight: 700,
        color: Colors.light.text
    },
    description: {
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
