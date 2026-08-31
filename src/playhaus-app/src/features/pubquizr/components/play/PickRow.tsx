import AppText from "@/components/text/AppText";
import { Brand, FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    label: string
    /** Whether it is currently marked. */
    active: boolean
    /**
     * Whether the mark is one of several or the only one allowed.
     *
     * Only the accessibility role changes: a screen reader has to be told whether taking
     * this row will drop the mark on another one, and sighted players find that out by
     * watching it happen. Everything else about the two is the same on purpose — the
     * rounds put them on consecutive screens, and a row that changed shape between them
     * would read as a different kind of thing to tap.
     */
    mode?: 'check' | 'radio'
    disabled?: boolean
    onPress: () => void
}

/**
 * One tappable line in a list of things that either landed or did not: a word of round
 * 4's turn, an answer of round 5's question.
 *
 * Both rounds spend most of their screens on exactly this row — ticking off what the
 * guesser got inside the clock, and then offering the leftovers one at a time round the
 * table — so it is one component rather than two sets of near-identical styles drifting
 * apart in two boards.
 */
export default function PickRow({ label, active, mode = 'check', disabled = false, onPress }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole={mode === 'radio' ? 'radio' : 'checkbox'}
            accessibilityState={{ checked: active, disabled }}
            accessibilityLabel={label}
            style={[styles.pick, active && styles.pickActive, disabled && styles.dimmed]}
        >
            <AppText style={[styles.pickText, active && styles.pickTextActive]} numberOfLines={1}>
                {label}
            </AppText>

            <Feather
                name={active ? 'check-circle' : 'circle'}
                size={18}
                color={active ? Brand.ink : theme.colors.textMuted}
            />
        </Pressable>
    )
}

/**
 * The row that says "who got this", drawn read-only.
 *
 * The other half of the same pair: `PickRow` is the screen where the decision is made and
 * this is the screen where it is looked at again before the points go out. Round 4 and
 * round 5 both end on a list of these.
 */
export function AwardRow({ label, winner, points, nobody }: {
    label: string
    /** Whoever is credited, or null for something nobody got. */
    winner: { initials: string, name: string, swatch: { color: string, foreground: string } } | null
    /** What this one paid, all in. */
    points: number
    /** What to call an uncredited row, e.g. "Nobody got it". */
    nobody: string
}) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.row}>
            <AppText style={styles.rowLabel} numberOfLines={1}>{label}</AppText>

            {winner === null ? (
                <View style={[styles.chip, styles.chipNobody]}>
                    <Feather name="x" size={13} color={theme.colors.textMuted} />

                    <AppText style={styles.chipText}>{nobody}</AppText>
                </View>
            ) : (
                <View style={[styles.chip, styles.chipActive]}>
                    <View style={[styles.chipAvatar, { backgroundColor: winner.swatch.color }]}>
                        <AppText style={[styles.chipInitials, { color: winner.swatch.foreground }]}>
                            {winner.initials}
                        </AppText>
                    </View>

                    <AppText style={[styles.chipText, styles.chipTextActive]} numberOfLines={1}>
                        {winner.name}
                    </AppText>

                    <AppText style={[styles.chipText, styles.chipTextActive]}>
                        {`+${points}`}
                    </AppText>
                </View>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    pick: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    pickActive: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    pickText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.lg,
        fontWeight: 800,
        color: theme.colors.text
    },

    pickTextActive: {
        color: Brand.ink
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    rowLabel: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.md,
        fontWeight: 800,
        color: theme.colors.text
    },

    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '58%',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },

    chipActive: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    // Dashed, so an uncredited row reads as an absence rather than as a player called
    // "nobody" sitting in the same kind of pill as a real one.
    chipNobody: {
        borderStyle: 'dashed'
    },

    chipAvatar: {
        width: 20,
        height: 20,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Brand.ink
    },

    chipInitials: {
        fontSize: 9,
        fontWeight: 900
    },

    chipText: {
        flexShrink: 1,
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    chipTextActive: {
        color: Brand.ink
    },

    dimmed: {
        opacity: 0.45
    }
}))
