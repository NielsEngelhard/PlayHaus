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
    icon?: ImageSource,
    description: string,
    deviceMode: DeviceMode,
    minMaxPlayers: string,
    durationInMinutes?: number,
    isNew?: boolean,
    playable: boolean,
    navigationUrl: Href
}

const TILE_SIZE = 56;

// One game, as a row on the home page.
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
                // Flattened, not an array.
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
    // A game that cannot be played yet keeps the shape and loses the colour.
    cardDim: theme.scheme === 'dark'
        ? {
            backgroundColor: theme.colors.backgroundElement,
            borderColor: theme.colors.borderSubtle
        }
        : {
            opacity: 0.85,
            ...hardShadow(3, theme.colors.border)
        },
    // The SVG marks draw their own background, border and glyph.
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
        // Ink and lemon in both schemes: the badge is a sticker on the card rather than a surface of the app's.
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
        // The gap between two facts is wider than the one between an icon and its own text.
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
