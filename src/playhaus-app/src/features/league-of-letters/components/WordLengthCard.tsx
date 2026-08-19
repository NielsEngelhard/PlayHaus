import AppText from "@/components/text/AppText";
import { Brand, Gradients, Spacing, linearGradient } from "@/constants/theme";
import { WORD_LENGTHS, type WordLength } from "@/features/league-of-letters/solo-settings";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Pressable, View } from "react-native";

interface Props {
    value: WordLength,
    onChange: (wordLength: WordLength) => void,
    /**
     * `card` (the default) is the shape the solo setup screen uses: a card of its own,
     * its label and hint across the top. `inline` drops the card and the header and
     * shortens the tiles, for a caller that is already a card and has already said what
     * this row is.
     *
     * The lobby's settings card is the one caller. It holds the same knob the solo
     * screen does — the same five tiles, the same lemon gradient on the answer — with
     * the frame taken off, because on that screen the code and the players come first.
     */
    variant?: 'card' | 'inline'
}

/** The stop the lemon holds to before it turns. A beat later than the house gradient. */
const TILE_GRADIENT_MIDPOINT = 60;

/** How long the word is. The chosen tile is wider, brighter and set in larger type. */
export default function WordLengthCard({ value, onChange, variant = 'card' }: Props) {
    const styles = useStyles();

    const inline = variant === 'inline';

    return (
        <View style={inline ? undefined : styles.card}>
            {/* Baseline-aligned, so the small hint sits on the same line as the label
                rather than floating in the middle of it. */}
            {!inline && (
                <View style={styles.header}>
                    <AppText style={styles.label}>Woordlengte</AppText>

                    <AppText style={styles.hint}>Klassiek is 5</AppText>
                </View>
            )}

            <View style={[styles.row, inline && styles.rowInline]}>
                {WORD_LENGTHS.map(length => (
                    <LengthTile
                        key={length}
                        length={length}
                        selected={length === value}
                        compact={inline}
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
    /** Shorter, for the lobby's settings card. Everything else about it is unchanged. */
    compact: boolean,
    onPress: () => void
}

function LengthTile({ length, selected, compact, onPress }: LengthTileProps) {
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
                compact && styles.tileCompact,
                selected ? styles.tileSelected : styles.tileUnselected,
                selected && linearGradient(Gradients.lemon, TILE_GRADIENT_MIDPOINT)
            ]}
        >
            <AppText
                style={[
                    selected ? styles.tileTextSelected : styles.tileText,
                    compact && (selected ? styles.tileTextSelectedCompact : styles.tileTextCompact)
                ]}
            >
                {length}
            </AppText>
        </Pressable>
    )
}

const TILE_HEIGHT = 60;

/** The lobby's height. Still a tile you can hit, with a fifth of the page given back. */
const TILE_HEIGHT_COMPACT = 46;

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
    // The caller's own header is already the right distance away.
    rowInline: {
        marginTop: 0,
        gap: 6
    },
    tile: {
        height: TILE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: theme.borderWidth
    },
    tileCompact: {
        height: TILE_HEIGHT_COMPACT,
        borderRadius: 13
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
    },
    // The two steps down keep the gap between chosen and not: it is the size difference
    // that says which one is the answer, before the colour does.
    tileTextCompact: {
        fontSize: 17
    },
    tileTextSelectedCompact: {
        fontSize: 20
    }
}))
