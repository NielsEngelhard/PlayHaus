import AppText from "@/components/text/AppText";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

interface Props {
    /**
     * The card's own colour, flat. A `Brand` hue rather than a palette token: this card is
     * an identity — "the yellow one is the daily" — and an identity that swapped with the
     * scheme would stop being one.
     */
    fill: string,
    /** The small caps over the title: "Today", "New". */
    eyebrow: string,
    title: string,
    /** A line or two under the title. Optional — the daily says it with the panel instead. */
    description?: string,
    /**
     * The top-right slot, level with the eyebrow: the daily's countdown to reset. Whatever
     * goes in it has to be narrow, because the title is what takes the rest of the row.
     */
    aside?: ReactNode,
    /**
     * The inset panel between the title and the action — a friends list, a bracket. Drawn
     * on a wash rather than on a colour of its own, so the card still reads as one object.
     */
    children?: ReactNode,
    /**
     * Which way that wash goes. `ink` sinks the panel into the card, which is what a list
     * of rows wants; `paper` lifts it out, which is what a diagram drawn in outlined
     * shapes needs to have something to be drawn *on*.
     */
    panelTone?: 'ink' | 'paper',
    /** What pressing this does, on the bar across the bottom. */
    action: string,
    onPress: () => void
}

/**
 * The loud card at the top of a mode page: the one way to play that the page is pushing.
 *
 * There is exactly one of these per page, and everything under it is quieter — see
 * `ModeOptionCard`. The whole card is the accent, the way `ModeCard`'s `solid` variant
 * hands its fill over, and the action is an ink bar across the bottom rather than a line
 * of text with an arrow: this is a button that happens to have a card wrapped round it.
 *
 * Ink and paper in both schemes for the fill and the action, because the fill is a brand
 * hue either way. The border and the lift come from the theme, so the card sits on the
 * dark canvas the same way every other card does.
 */
export default function FeatureModeCard({
    fill,
    eyebrow,
    title,
    description,
    aside,
    children,
    panelTone = 'ink',
    action,
    onPress
}: Props) {
    const styles = useStyles();

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='button'
            accessibilityLabel={`${title}. ${action}`}
            style={[styles.card, { backgroundColor: fill }]}
        >
            <View style={styles.head}>
                <View style={styles.headText}>
                    <AppText style={styles.eyebrow}>{eyebrow}</AppText>

                    <AppText style={styles.title}>{title}</AppText>

                    {description !== undefined && (
                        <AppText style={styles.description}>{description}</AppText>
                    )}
                </View>

                {aside}
            </View>

            {children !== undefined && (
                <View style={[styles.panel, panelTone === 'paper' && styles.panelPaper]}>
                    {children}
                </View>
            )}

            {/* Not a `TextButton`: that one wears an accent fill and a hard shadow, which
                on a card that is already an accent with a hard shadow would be a button
                lying on top of itself. */}
            <View style={styles.action}>
                <AppText style={styles.actionText}>{action}</AppText>
            </View>
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        padding: Spacing.three,
        gap: 12,
        borderRadius: 24,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        ...theme.popShadow(theme.colors.shadow)
    },

    head: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10
    },
    // Takes the room the aside does not, so a long title wraps rather than pushing the
    // countdown off the card.
    headText: {
        flex: 1,
        minWidth: 0
    },

    eyebrow: {
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: withAlpha(Brand.ink, 0.55)
    },
    title: {
        marginTop: 2,
        fontSize: 24,
        fontWeight: 900,
        lineHeight: 24 * 1.05,
        letterSpacing: -0.9,
        color: Brand.ink
    },
    description: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 12 * 1.4,
        color: withAlpha(Brand.ink, 0.7)
    },

    // A hole punched in the fill rather than a surface of the app's, so it does not follow
    // the canvas — the same reasoning as `ModeCard`'s solid tile.
    panel: {
        padding: 12,
        gap: 8,
        borderRadius: 16,
        backgroundColor: withAlpha(Brand.ink, 0.07)
    },
    panelPaper: {
        backgroundColor: withAlpha(Brand.textOnAccent, 0.65)
    },

    action: {
        paddingVertical: 11,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.ink
    },
    actionText: {
        textAlign: 'center',
        fontSize: 13.5,
        fontWeight: 900,
        color: Brand.textOnAccent
    }
}))
