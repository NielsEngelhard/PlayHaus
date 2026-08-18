import AppText from "@/components/text/AppText";
import { Brand, Gradients, Spacing, linearGradient } from "@/constants/theme";
import { WORD_LENGTHS, type WordLength } from "@/features/league-of-letters/solo-settings";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Pressable, View } from "react-native";

interface Props {
    value: WordLength,
    onChange: (wordLength: WordLength) => void
}

/** The stop the lemon holds to before it turns. A beat later than the house gradient. */
const TILE_GRADIENT_MIDPOINT = 60;

/** How long the word is. The chosen tile is wider, brighter and set in larger type. */
export default function WordLengthCard({ value, onChange }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.card}>
            {/* Baseline-aligned, so the small hint sits on the same line as the label
                rather than floating in the middle of it. */}
            <View style={styles.header}>
                <AppText style={styles.label}>Woordlengte</AppText>

                <AppText style={styles.hint}>Klassiek is 5</AppText>
            </View>

            <View style={styles.row}>
                {WORD_LENGTHS.map(length => (
                    <LengthTile
                        key={length}
                        length={length}
                        selected={length === value}
                        onPress={() => onChange(length)}
                    />
                ))}
            </View>
        </View>
    )
}

interface LengthTileProps {
    length: WordLength,
    selected: boolean,
    onPress: () => void
}

function LengthTile({ length, selected, onPress }: LengthTileProps) {
    const styles = useStyles();

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='radio'
            accessibilityLabel={`${length} letters`}
            // `aria-checked` rather than `accessibilityState={{ checked }}`: the latter
            // never reaches the DOM in this version, so the chosen tile would look
            // selected but not announce as selected.
            aria-checked={selected}
            style={[
                styles.tile,
                selected ? styles.tileSelected : styles.tileUnselected,
                selected && linearGradient(Gradients.lemon, TILE_GRADIENT_MIDPOINT)
            ]}
        >
            <AppText style={selected ? styles.tileTextSelected : styles.tileText}>
                {length}
            </AppText>
        </Pressable>
    )
}

const TILE_HEIGHT = 60;

const useStyles = createThemedStyles(theme => ({
    card: {
        padding: Spacing.three,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border))
    },
    header: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between'
    },
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    hint: {
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    row: {
        marginTop: Spacing.three - 4,
        flexDirection: 'row',
        gap: Spacing.two
    },
    tile: {
        height: TILE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: theme.borderWidth
    },
    // Wider than its neighbours as well as brighter: at this size the extra quarter of
    // a share is what makes the answer readable at a glance, before any colour is.
    tileSelected: {
        flex: 1.25,
        borderColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.border,
        boxShadow: theme.scheme === 'dark'
            ? '0 10px 20px -12px rgba(255, 229, 56, 0.8)'
            : '2px 2px 0 0 #0F0D12, 0 10px 18px -12px rgba(15, 13, 18, 0.6)'
    },
    tileUnselected: {
        flex: 1,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.scheme === 'dark'
            ? theme.colors.backgroundElement
            : theme.colors.background
    },
    tileText: {
        fontSize: 22,
        fontWeight: 900,
        color: theme.colors.textFaint
    },
    tileTextSelected: {
        fontSize: 26,
        fontWeight: 900,
        color: Brand.ink
    }
}))
