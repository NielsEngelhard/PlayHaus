import AppText from "@/components/text/AppText";
import { Brand, Spacing, linearGradient } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    icon: keyof typeof Feather.glyphMap,
    /**
     * Three stops for the icon tile, lightest first. See `Gradients`.
     *
     * `solid` reads the same three stops differently — see the flag below — so a card
     * keeps its accent whichever design it is drawn in, and the caller passes one thing
     * either way.
     */
    gradient: readonly [string, string, string],
    /** Ink for the icon on that tile, already resolved for the scheme by the caller. */
    iconInk: string,
    /**
     * How bright the tile's lit top edge is. The paler the gradient, the more it takes
     * to read as a highlight — the lemon tile needs more than the orange one.
     *
     * Ignored by `solid`, whose tile is flat paper.
     */
    highlight: number,
    title: string,
    /** A short fact beside the title, like a player count. Optional. */
    chip?: string,
    description: string,
    /**
     * What tapping this does, as two or three words. Sits under the description.
     *
     * Not drawn by `solid`, which says the same thing with the card's own colour.
     */
    action: string,
    /** Where tapping this navigates. Optional when the card is not navigable. */
    navigationUrl?: Href,
    /** Whether the card is disabled. Defaults to false. */
    isDisabled?: boolean,
    /**
     * Draw the loud design instead of the quiet one. Defaults to false, which is the
     * original card, unchanged.
     *
     * The two are the same object seen from different distances. The quiet card is a
     * paper surface with the accent kept to a small tile — right where a page has
     * several of them and none should shout. The loud one hands the whole card over to
     * the accent, drops the action line, and stamps an oversized number into the
     * corner: for the top of a game's own page, where there are exactly two of these
     * and they are the point of the screen.
     *
     * Because the fill *is* the accent, the three gradient stops are read as flat
     * colours here rather than shaded into one: the middle stop fills the card, and the
     * lightest one outlines it in dark mode, where a hard ink border has nothing to
     * bite against.
     */
    solid?: boolean,
    /**
     * `solid` only. The number bled into the bottom-right corner — how many devices,
     * how many players. Big enough to run off two edges, and quiet enough to read as
     * texture rather than as a label.
     */
    watermark?: string,
    /**
     * `solid` only. Which of the two inks stays readable on the fill: ink for the pale
     * accents, paper for the saturated ones. Defaults to ink.
     */
    onFill?: OnFill
}

export type OnFill = 'ink' | 'paper';

/**
 * The three tones a solid card's contents wear, per ink.
 *
 * The secondary two are the ink at reduced strength rather than separate colours, which
 * is what keeps a card reading as one object: the description is the title gone quiet,
 * and the watermark is the same again, quiet enough to sit under everything else.
 */
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

/**
 * One way to play a game: an icon tile at the top, and the name, a line about it and —
 * in the quiet design — its action pinned to the bottom.
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
    isDisabled = false,
    solid = false,
    watermark,
    onFill = 'ink'
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const dark = theme.scheme === "dark";
    const fill = gradient[1];
    const on = ON_FILL[onFill];

    const card = (
        <Pressable
            disabled={isDisabled}
            // Flattened: `Link asChild` clones this onto the anchor it renders, and a
            // style array does not survive that trip.
            style={StyleSheet.flatten([
                styles.card,
                solid && styles.cardSolid,
                // Inline because the fill is the caller's, and a themed sheet is built
                // once per scheme with no card in front of it to ask.
                solid && {
                    backgroundColor: fill,
                    // Dark has no ink line to draw — see `Palette.border` — so the
                    // outline steps up to the accent's own lightest stop, and the lift
                    // comes from a wash of the fill underneath instead.
                    borderColor: dark ? gradient[0] : theme.colors.border,
                    ...(dark
                        ? { boxShadow: `0 16px 28px -16px ${fill}` }
                        : theme.popShadow(theme.colors.border))
                },
                isDisabled && styles.cardDisabled
            ])}
        >
            {solid && watermark !== undefined && (
                <AppText
                    // Decoration. A screen reader reading "10" out between the icon and
                    // the title would be reading the wallpaper aloud.
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                        styles.watermark,
                        {
                            // A second digit is that much wider, and the number should
                            // run off the same amount of edge either way.
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

                <AppText
                    style={[
                        solid ? styles.descriptionSolid : styles.description,
                        solid && { color: on.muted },
                        isDisabled && !solid && styles.textDisabled
                    ]}
                >
                    {description}
                </AppText>

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
        ...(theme.scheme === "dark" ? {} : theme.popShadow(theme.colors.border))
    },

    cardSolid: {
        // Shorter, because there is no action line under the description to make room
        // for, and the pair still sizes itself off whichever card says more.
        minHeight: 132,
        padding: 14,
        // The watermark is drawn past two of these edges and clipped back to them.
        overflow: "hidden"
    },

    cardDisabled: {
        opacity: 0.7
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
        // Above the watermark, which is drawn first and would otherwise be laid over the
        // tile in the corner it grows out of.
        zIndex: 1,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        // Ink and paper in both schemes: the tile is a hole punched in the accent rather
        // than a surface of the app's, so it does not follow the canvas.
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    tileDisabled: {
        opacity: 0.7
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
