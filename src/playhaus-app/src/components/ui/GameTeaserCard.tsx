import AppText from "@/components/text/AppText";
import { DEVICE_MODE_KEYS, type DeviceMode } from "@/constants/games";
import { Brand, Spacing, hardShadow, linearGradient } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Image, type ImageSource } from "expo-image";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    color: string,
    gradient: readonly [string, string, string],
    glyphInk: string,
    name: string,
    /** The game's own icon. Falls back to the name's initial when unset. */
    icon?: ImageSource,
    description: string,
    deviceMode: DeviceMode,
    minMaxPlayers: string,
    durationInMinutes?: number,
    /** Wears the badge beside the name — `game.isNew`. */
    isNew?: boolean,
    playable: boolean,
    navigationUrl: Href
}

const TILE_SIZE = 56;

/**
 * One game, as a row on the home page: its mark, its name, a line about it, and the
 * three facts you need before you can say yes.
 *
 * The card is paper in both schemes and the game's own colour is the shadow under it,
 * which is the only place the accent appears — a row of these should read as one list
 * with three colours in it rather than as three coloured cards. The marks carry the
 * accent themselves, so the hue is never far from the name it belongs to.
 *
 * The facts are set as a plain line rather than as `Chip`s. Three pills in a row on a
 * card this size read as three controls, and none of them is pressable; an icon in front
 * of each is enough to say which fact is which.
 */
export default function GameTeaserCard({
    color,
    gradient,
    glyphInk,
    name,
    icon,
    description,
    deviceMode,
    minMaxPlayers,
    durationInMinutes,
    isNew = false,
    playable,
    navigationUrl,
}: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <Link href={navigationUrl} asChild>
            <Pressable
                // Flattened, not an array. `Link asChild` clones this onto the anchor it
                // renders, and a style array survives that trip as `{0: …, 1: …}` — which
                // stringifies into nothing and drops the card's whole appearance.
                style={StyleSheet.flatten([
                    styles.card,
                    playable ? hardShadow(3, color) : styles.cardDim
                ])}
            >
                {icon ? (
                    <Image source={icon} style={styles.icon} />
                ) : (
                    <View style={[styles.tile, linearGradient(gradient)]}>
                        <AppText style={[styles.glyph, { color: glyphInk }]}>
                            {name[0]}
                        </AppText>
                    </View>
                )}

                <View style={styles.body}>
                    <View style={styles.nameRow}>
                        <AppText style={styles.name} numberOfLines={1}>
                            {name}
                        </AppText>

                        {isNew && (
                            <View style={styles.badge}>
                                <AppText style={styles.badgeText}>
                                    {t('games.newBadge')}
                                </AppText>
                            </View>
                        )}

                        {!playable && (
                            <View style={styles.badge}>
                                <AppText style={styles.badgeText}>
                                    {t('games.wipBadge')}
                                </AppText>
                            </View>
                        )}
                    </View>

                    <AppText style={styles.description} numberOfLines={2}>
                        {description}
                    </AppText>

                    <View style={styles.facts}>
                        <Fact icon="user" text={minMaxPlayers} />

                        <Fact icon="smartphone" text={t(DEVICE_MODE_KEYS[deviceMode])} />

                        {durationInMinutes !== undefined && (
                            <Fact
                                icon="clock"
                                text={`±${durationInMinutes} ${t('common.minutes')}`}
                            />
                        )}
                    </View>
                </View>

                <Feather
                    name="chevron-right"
                    size={19}
                    color={theme.colors.textMuted}
                />
            </Pressable>
        </Link>
    )
}

/** One fact on the line under the description: its icon, and the fact itself. */
function Fact({ icon, text }: { icon: keyof typeof Feather.glyphMap, text: string }) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.fact}>
            <Feather name={icon} size={12} color={theme.colors.textMuted} />

            <AppText style={styles.factText}>{text}</AppText>
        </View>
    );
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: 13,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary
    },
    // A game that cannot be played yet keeps the shape and loses the colour: the shadow
    // goes back to the scheme's own line, which is what the accent was standing in for.
    cardDim: theme.scheme === 'dark'
        ? {
            backgroundColor: theme.colors.backgroundElement,
            borderColor: theme.colors.borderSubtle
        }
        : {
            opacity: 0.85,
            ...hardShadow(3, theme.colors.border)
        },
    // The SVG marks draw their own background, border and glyph, so this is sized and
    // rounded to match the tile below without repeating either.
    icon: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        borderRadius: 14
    },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border,
        // A lit top edge, so the tile reads as domed rather than printed.
        boxShadow: 'inset 0 2px 0 rgba(255, 255, 255, 0.35)'
    },
    glyph: {
        fontSize: 26,
        fontWeight: 900
    },
    body: {
        flex: 1,
        minWidth: 0
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    name: {
        flexShrink: 1,
        fontSize: 17.5,
        fontWeight: 900,
        lineHeight: 17.5 * 1.1,
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    badge: {
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: 1.5,
        // Ink and lemon in both schemes: the badge is a sticker on the card rather than a
        // surface of the app's, so it does not follow the canvas.
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon,
        paddingVertical: 1,
        paddingHorizontal: 7
    },
    badgeText: {
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: Brand.ink
    },
    description: {
        marginTop: 4,
        fontSize: 11.5,
        fontWeight: 500,
        lineHeight: 11.5 * 1.4,
        color: theme.colors.textSecondary
    },
    facts: {
        marginTop: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        // The gap between two facts is wider than the one between an icon and its own
        // text, which is what groups them without a separator having to.
        gap: Spacing.two + 2
    },
    fact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    factText: {
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textMuted
    }
}))
