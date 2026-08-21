import AppText from "@/components/text/AppText";
import { Brand, Spacing, linearGradient } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    /** The facts chips, already translated. Drawn in order, wrapping as needed. */
    tags: readonly string[],
    /** The game's accent. Colours the shadow this card throws in dark mode. */
    color: string,
    /** Three stops for the glyph tile, lightest first. */
    gradient: readonly [string, string, string],
    /** Ink for the glyph, already resolved for the current scheme by the caller. */
    glyphInk: string,
    name: string,
    description: string,
    playable: boolean,
    navigationUrl: Href
}

const TILE_SIZE = 78;

/**
 * One game, as it appears on the home page: glyph tile, name, its facts as chips, and
 * either a play button or a "not yet" badge.
 *
 * A game that can't be played yet is not hidden — it is dimmed. Light does that by
 * fading the whole card, dark by sinking it below the canvas onto a darker surface and
 * taking its shadow away, because fading something that is already near-black just
 * makes it disappear.
 */
export default function NavigationCard({
    tags,
    color,
    gradient,
    glyphInk,
    name,
    description,
    playable,
    navigationUrl,
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <Link href={navigationUrl} asChild>
            <Pressable
                // Flattened, not an array. `Link asChild` clones this onto the anchor it
                // renders, and a style array survives that trip as `{0: …, 1: …}` — which
                // stringifies into nothing and drops the card's whole appearance.
                style={StyleSheet.flatten([
                    styles.card,
                    playable ? theme.popShadow(color) : styles.cardDim
                ])}
            >
                <View style={[styles.tile, linearGradient(gradient)]}>
                    <AppText style={[styles.glyph, { color: glyphInk }]}>{name[0]}</AppText>
                </View>

                <View style={styles.body}>
                    <AppText style={styles.name} numberOfLines={1}>{name}</AppText>

                    <View style={styles.chips}>
                        {tags.map(chip => (
                            <View key={chip} style={styles.chip}>
                                <AppText style={styles.chipText}>{chip}</AppText>
                            </View>
                        ))}
                    </View>

                    {description && (
                        <View style={styles.status}>
                            <AppText style={styles.statusText}>{description}</AppText>
                        </View>
                    )}
                </View>

                <View style={styles.play}>
                    <Feather
                        name='play'
                        size={16}
                        color={theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent}
                    />
                </View>
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
        backgroundColor: theme.colors.backgroundSecondary
    },
    cardDim: theme.scheme === 'dark'
        ? {
            backgroundColor: theme.colors.backgroundElement,
            borderColor: theme.colors.borderSubtle
        }
        : {
            opacity: 0.85,
            ...theme.popShadow(theme.colors.border)
        },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        // Only light outlines the tile. In dark the gradient is the brightest thing on
        // the card already, and a grey line around it would only mute it.
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border,
        // A lit top edge, so the tile reads as domed rather than printed.
        boxShadow: 'inset 0 2px 0 rgba(255, 255, 255, 0.35)'
    },
    glyph: {
        fontSize: 34,
        fontWeight: 900
    },
    body: {
        flex: 1,
        minWidth: 0
    },
    name: {
        fontSize: 19,
        fontWeight: 900,
        lineHeight: 19 * 1.1,
        letterSpacing: -0.6,
        color: theme.colors.text
    },
    chips: {
        marginTop: 7,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5
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
        marginTop: Spacing.two,
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    status: {
        marginTop: Spacing.two,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 999,
        // Light picks the green out against paper; on the dark canvas the mint carries
        // further, which is the swap the design makes.
        backgroundColor: theme.scheme === 'dark' ? theme.colors.mint : theme.colors.available
    },
    statusText: {
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    play: {
        width: 38,
        height: 38,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border,
        // Ink on paper, lemon on ink: whichever of the two is the louder note in the
        // scheme it sits in.
        backgroundColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.text
    },
    soon: {
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.border,
        backgroundColor: theme.colors.lemon,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two + 2
    },
    soonText: {
        fontSize: 10.5,
        fontWeight: 900,
        letterSpacing: 0.6,
        color: Brand.ink
    }
}))
