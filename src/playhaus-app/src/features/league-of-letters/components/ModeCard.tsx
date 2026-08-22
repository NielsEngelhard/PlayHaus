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
    /** Where tapping this navigates. Optional when the card is not navigable. */
    navigationUrl?: Href,
    /** Whether the card is disabled. Defaults to false. */
    isDisabled?: boolean
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
    navigationUrl,
    isDisabled = false
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const card = (
        <Pressable
            disabled={isDisabled}
            // Flattened: `Link asChild` clones this onto the anchor it renders, and a
            // style array does not survive that trip.
            style={StyleSheet.flatten([
                styles.card,
                isDisabled && styles.cardDisabled
            ])}
        >
            <View
                style={[
                    styles.tile,
                    linearGradient(gradient),
                    isDisabled && styles.tileDisabled,
                    {
                        boxShadow: `inset 0 2px 0 rgba(255, 255, 255, ${highlight})`
                    }
                ]}
            >
                <Feather
                    name={icon}
                    size={24}
                    color={isDisabled ? theme.colors.textMuted : iconInk}
                />
            </View>

            <View style={styles.body}>
                <View style={styles.titleRow}>
                    <AppText style={[styles.title, isDisabled && styles.textDisabled]}>
                        {title}
                    </AppText>

                    {chip !== undefined && (
                        <AppText style={styles.chip}>{chip}</AppText>
                    )}
                </View>

                <AppText style={[styles.description, isDisabled && styles.textDisabled]}>
                    {description}
                </AppText>

                <View style={styles.actionRow}>
                    <AppText style={[styles.action, isDisabled && styles.textDisabled]}>
                        {action}
                    </AppText>

                    <Feather
                        name="arrow-right"
                        size={14}
                        color={isDisabled ? theme.colors.textMuted : theme.colors.text}
                    />
                </View>
            </View>
        </Pressable>
    );

    // A disabled card should not be wrapped in Link.
    if (isDisabled || navigationUrl === undefined) {
        return card;
    }

    return (
        <Link href={navigationUrl} asChild>
            {card}
        </Link>
    );
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flex: 1,
        flexBasis: 0,
        minWidth: 0,
        minHeight: 186,
        padding: Spacing.three,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === "dark" ? {} : theme.popShadow(theme.colors.border))
    },

    cardDisabled: {
        opacity: 0.7
    },

    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: theme.scheme === "dark" ? 0 : theme.borderWidth,
        borderColor: theme.colors.border
    },

    tileDisabled: {
        opacity: 0.7
    },

    body: {
        marginTop: "auto"
    },

    titleRow: {
        flexDirection: "row",
        alignItems: "baseline",
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
        flexDirection: "row",
        alignItems: "center",
        gap: 6
    },

    action: {
        fontSize: 12,
        fontWeight: 900,
        color: theme.colors.text
    },

    textDisabled: {
        color: theme.colors.textMuted
    }
}));