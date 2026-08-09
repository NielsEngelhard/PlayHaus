import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { WORD_LENGTHS, type WordLength } from "@/features/league-of-letters/solo-settings";
import { intoRows } from "@/utils/rows";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    value: WordLength,
    onChange: (wordLength: WordLength) => void
}

const COLUMNS = 6

/** How long the word is. The chosen tile is the one standing proudest. */
export default function WordLengthCard({ value, onChange }: Props) {
    return (
        <Card>
            <AppText style={styles.label}>Woordlengte</AppText>

            <View style={styles.grid}>
                {intoRows(WORD_LENGTHS, COLUMNS).map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        {row.map(length => (
                            <LengthTile
                                key={length}
                                length={length}
                                selected={length === value}
                                onPress={() => onChange(length)}
                            />
                        ))}
                    </View>
                ))}
            </View>

            <AppText style={styles.hint}>Klassiek is 5 letters.</AppText>
        </Card>
    )
}

interface LengthTileProps {
    length: WordLength,
    selected: boolean,
    onPress: () => void
}

function LengthTile({ length, selected, onPress }: LengthTileProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='radio'
            accessibilityLabel={`${length} letters`}
            // `aria-checked` rather than `accessibilityState={{ checked }}`: the latter
            // never reaches the DOM in this version, so the chosen tile would look
            // selected but not announce as selected.
            aria-checked={selected}
            style={[styles.tile, selected ? styles.tileSelected : styles.tileUnselected]}
        >
            <AppText style={styles.tileText}>{length}</AppText>
        </Pressable>
    )
}

const TILE_HEIGHT = 56;

const styles = StyleSheet.create({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    },
    grid: {
        marginTop: Spacing.three,
        gap: Spacing.two
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.two
    },
    tile: {
        flex: 1,
        height: TILE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14
    },
    // Lemon is the colour the Solo card already wears on the game's index page.
    tileSelected: {
        backgroundColor: Colors.light.lemon,
        ...Shadows.hardLarge
    },
    // The rest sit back a step: shallower shadow, a touch of the page showing through.
    tileUnselected: {
        backgroundColor: Colors.light.backgroundInput,
        opacity: 0.8,
        ...Shadows.hardSmall
    },
    tileText: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        color: Colors.light.text
    },
    hint: {
        marginTop: Spacing.three,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        color: Colors.light.textSecondary
    }
})
