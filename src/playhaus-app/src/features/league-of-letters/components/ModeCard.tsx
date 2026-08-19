import AppText from "@/components/text/AppText";
import { Spacing, linearGradient } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    icon: keyof typeof Feather.glyphMap,
    /** Three stops for the icon tile, lightest first. See `Gradients`. */
    gradient: readonly [string, string, string],
    /** Ink for the icon on that tile, already resolved for the scheme by the caller. */
    iconInk: string,
    /**
     * How bright the tile's lit top edge is. The paler the gradient, the more it takes
     * to read as a highlight — the lemon tile needs more than the orange one.
     */
    highlight: number,
    title: string,
    /** A short fact beside the title, like a player count. Optional. */
    chip?: string,
    description: string,
    /** What tapping this does, as two or three words. Sits under the description. */
    action: string,
    navigationUrl: Href
}

const TILE_SIZE = 56;

/**
 * One way to play a game: a gradient icon tile at the top, and the name, a line about it
 * and its action pinned to the bottom.
 *
 * Built to stand beside its twin rather than above it. Two of these share a row, so the
 * card is sized by the row and not by its own contents — which is why the body is pushed
 * down by `marginTop: 'auto'` and the card carries a floor height. Whichever of the pair
 * has the longer description sets the height, and both baselines still line up.
 */
export default function ModeCard({
    icon,
    gradient,
    iconInk,
    highlight,
    title,
    chip,
    description,
    action,
    navigationUrl
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <Link href={navigationUrl} asChild>
            <Pressable
                // Flattened: `Link asChild` clones this onto the anchor it renders, and a
                // style array does not survive that trip.
                style={StyleSheet.flatten([styles.card])}
            >
                <View
                    style={[
                        styles.tile,
                        linearGradient(gradient),
                        { boxShadow: `inset 0 2px 0 rgba(255, 255, 255, ${highlight})` }
                    ]}
                >
                    <Feather name={icon} size={24} color={iconInk} />
                </View>

                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <AppText style={styles.title}>{title}</AppText>

                        {/* No pill around it here. At this width a bordered chip beside a
                            20pt title crowds the corner, and the count is a footnote to
                            the name rather than a label of its own. */}
                        {chip !== undefined && (
                            <AppText style={styles.chip}>{chip}</AppText>
                        )}
                    </View>

                    <AppText style={styles.description}>{description}</AppText>

                    <View style={styles.actionRow}>
                        <AppText style={styles.action}>{action}</AppText>

                        <Feather name='arrow-right' size={14} color={theme.colors.text} />
                    </View>
                </View>
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flex: 1,
        // `flex: 1` pins the basis to zero, so without this the pair would be sized by
        // nothing and both cards would collapse to their padding.
        flexBasis: 0,
        minWidth: 0,
        // A floor rather than a fixed height: the taller of the two still wins, and this
        // stops a short pair from reading as a pair of buttons.
        minHeight: 186,
        padding: Spacing.three,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        // Dark leaves these flat. Every card on this page is equally a way in, so none
        // of them gets the coloured shadow that marks something out.
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border))
    },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        // Only light outlines the tile. In dark the gradient is the brightest thing on
        // the card already, and a grey line around it would only mute it.
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border
    },
    // Everything below the tile, held to the bottom of whatever height the row settles on.
    body: {
        marginTop: 'auto'
    },
    titleRow: {
        flexDirection: 'row',
        // Baselines rather than centres: the chip is much smaller type, and centring it
        // would float it above the word it belongs to.
        alignItems: 'baseline',
        gap: 6
    },
    title: {
        fontSize: 20,
        fontWeight: 900,
        letterSpacing: -0.6,
        color: theme.colors.text
    },
    chip: {
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },
    description: {
        marginTop: 5,
        fontSize: 12.5,
        lineHeight: 12.5 * 1.4,
        color: theme.colors.textSecondary
    },
    actionRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    action: {
        fontSize: 12,
        fontWeight: 900,
        color: theme.colors.text
    }
}))
