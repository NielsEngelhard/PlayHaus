import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import type { MockSnapshot } from "@/features/league-of-letters/mock-games";
import { Pressable, ScrollView, StyleSheet } from "react-native";

interface Props {
    snapshots: MockSnapshot[],
    value: string,
    onChange: (id: string) => void
}

/**
 * TODO: delete this along with `mock-games.ts` once the API serves games.
 *
 * The screen is built against fixed snapshots rather than a playable simulation, which
 * is only worth anything if every snapshot can actually be reached. This is that: a row
 * of chips that swaps which one is on screen. It is scaffolding, not a feature.
 */
export default function MockStateSwitcher({ snapshots, value, onChange }: Props) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.row}
        >
            <AppText style={styles.label}>Mock</AppText>

            {snapshots.map(snapshot => (
                <Pressable
                    key={snapshot.id}
                    onPress={() => onChange(snapshot.id)}
                    accessibilityRole='radio'
                    accessibilityLabel={snapshot.label}
                    aria-checked={snapshot.id === value}
                    style={[styles.chip, snapshot.id === value && styles.chipSelected]}
                >
                    <AppText style={styles.chipText}>{snapshot.label}</AppText>
                </Pressable>
            ))}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flexGrow: 0
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingBottom: Spacing.half + 2,
        paddingRight: Spacing.half + 2
    },
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    },
    chip: {
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 999,
        paddingVertical: Spacing.half,
        paddingHorizontal: Spacing.two + 2,
        backgroundColor: Colors.light.backgroundInput,
        opacity: 0.8,
        ...Shadows.hardSmall
    },
    chipSelected: {
        backgroundColor: Colors.light.lemon,
        opacity: 1,
        ...Shadows.hard
    },
    chipText: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: Colors.light.text
    }
})
