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
    navigationUrl: Href
}

const TILE_SIZE = 60;

/** One way to play a game: icon tile, name, a line about it, and a chevron. */
export default function ModeCard({
    icon,
    gradient,
    iconInk,
    highlight,
    title,
    chip,
    description,
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

                        {chip !== undefined && (
                            <View style={styles.chip}>
                                <AppText style={styles.chipText}>{chip}</AppText>
                            </View>
                        )}
                    </View>

                    <AppText style={styles.description}>{description}</AppText>
                </View>

                <Feather name='chevron-right' size={20} color={theme.colors.text} />
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three - 2,
        padding: Spacing.three - 2,
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
    body: {
        flex: 1,
        minWidth: 0
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },
    title: {
        fontSize: 18,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    chip: {
        borderWidth: 1.5,
        borderColor: theme.colors.borderSubtle,
        borderRadius: 999,
        paddingVertical: 2,
        paddingHorizontal: Spacing.two
    },
    chipText: {
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    description: {
        marginTop: Spacing.one,
        fontSize: 13,
        lineHeight: 13 * 1.4,
        color: theme.colors.textSecondary
    }
}))
