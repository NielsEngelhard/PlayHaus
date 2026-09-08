import AppText from "@/components/text/AppText";
import { Badge } from "@/components/ui/Badge";
import { Brand, Spacing, linearGradient } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    icon: keyof typeof Feather.glyphMap,
    // Three stops for the icon tile, lightest first.
    gradient: readonly [string, string, string],
    /** Ink for the icon on that tile, already resolved for the scheme by the caller. */
    iconInk: string,
    // How bright the tile's lit top edge is.
    highlight: number,
    title: string,
    /** A short fact beside the title, like a player count. Optional. */
    chip?: string,
    description: string,
    // What tapping this does, as two or three words.
    action: string,
    /** Where tapping this navigates. Optional when the card is not navigable. */
    navigationUrl?: Href,
    /** Whether the card is disabled. Defaults to false. */
    isDisabled?: boolean,
    // Draw the loud design instead of the quiet one.
    solid?: boolean,
    // `solid` only.
    watermark?: string,
    // `solid` only.
    onFill?: OnFill
}

export type OnFill = 'ink' | 'paper';

// The three tones a solid card's contents wear, per ink.
const ON_FILL: Record<OnFill, { text: string, muted: string, watermark: string }> = {
    ink: {
        text: Brand.ink,
        muted: 'rgba(15, 13, 18, 0.68)',
        watermark: 'rgba(15, 13, 18, 0.1)'
    },
    paper: {
        text: Brand.textOnAccent,
        muted: 'rgba(255, 255, 255, 0.8)',
        watermark: 'rgba(255, 255, 255, 0.16)'
    }
};

const TILE_SIZE = 56;
const TILE_SIZE_SOLID = 40;

// One way to play a game. Sized by the row it shares with its twin, not by its own contents.
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
    isDisabled = false,
    solid = false,
    watermark,
    onFill = 'ink'
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const fill = gradient[1];
    const on = ON_FILL[onFill];

    const card = (
        <Pressable
            disabled={isDisabled}
            // Flattened: `Link asChild` clones this onto the anchor it renders, and a style array does not survive that trip.
            style={StyleSheet.flatten([
                styles.card,
                solid && styles.cardSolid,
                // Inline because the fill is the caller's.
                solid && { backgroundColor: fill },
                isDisabled && styles.cardDisabled
            ])}
        >
            {solid && watermark !== undefined && (
                <AppText
                    // Decoration.
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                        styles.watermark,
                        {
                            // A second digit is that much wider, and the number should run off the same amount of edge either way.
                            right: watermark.length > 1 ? -12 : -8,
                            color: on.watermark
                        }
                    ]}
                >
                    {watermark}
                </AppText>
            )}

            <View
                style={[
                    solid ? styles.tileSolid : styles.tile,
                    !solid && linearGradient(gradient),
                    isDisabled && styles.tileDisabled,
                    !solid && {
                        boxShadow: `inset 0 2px 0 rgba(255, 255, 255, ${highlight})`
                    }
                ]}
            >
                <Feather
                    name={icon}
                    size={solid ? 19 : 24}
                    color={isDisabled ? theme.colors.textMuted : iconInk}
                />
            </View>

            <View style={styles.body}>
                <View style={styles.titleRow}>
                    <AppText
                        style={[
                            solid ? styles.titleSolid : styles.title,
                            solid && { color: on.text },
                            isDisabled && !solid && styles.textDisabled
                        ]}
                    >
                        {title}
                    </AppText>

                    {chip !== undefined && (
                        <AppText style={[styles.chip, solid && { color: on.muted }]}>
                            {chip}
                        </AppText>
                    )}
                </View>

                {isDisabled ? (
                    <Badge text="Coming soon..." />          
                ) : (
                    <AppText
                        style={[
                            solid ? styles.descriptionSolid : styles.description,
                            solid && { color: on.muted },
                            isDisabled && !solid && styles.textDisabled
                        ]}
                    >
                        {description}
                    </AppText>                    
                )}

                {!solid && (
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
                )}
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
        ...theme.popShadow(theme.colors.shadow)
    },

    cardSolid: {
        // Shorter, because there is no action line under the description to make room for.
        minHeight: 132,
        padding: 14,
        // The watermark is drawn past two of these edges and clipped back to them.
        overflow: "hidden"
    },

    cardDisabled: {
        // opacity: 0.7
    },

    watermark: {
        position: "absolute",
        bottom: -30,
        fontSize: 104,
        lineHeight: 104,
        fontWeight: 900
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

    tileSolid: {
        width: TILE_SIZE_SOLID,
        height: TILE_SIZE_SOLID,
        flexShrink: 0,
        // Above the watermark, which is drawn first and would otherwise be laid over the tile in the corner it grows out of.
        zIndex: 1,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        // Ink and paper in both schemes: the tile is a hole punched in the accent rather than a surface of the app's.
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    tileDisabled: {
        // opacity: 0.7
    },

    body: {
        marginTop: "auto",
        zIndex: 1
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

    titleSolid: {
        fontSize: 19,
        lineHeight: 19,
        fontWeight: 900,
        letterSpacing: -0.6
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

    descriptionSolid: {
        marginTop: 5,
        fontSize: 12,
        lineHeight: 12 * 1.35,
        fontWeight: 700
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
