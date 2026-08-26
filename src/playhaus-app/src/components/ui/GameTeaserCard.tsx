import AppText from "@/components/text/AppText";
import { DEVICE_MODE_KEYS, type DeviceMode } from "@/constants/games";
import { Brand, Spacing, linearGradient } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Image, type ImageSource } from "expo-image";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Chip from "./Chip";

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
    playable: boolean,
    navigationUrl: Href
}

const TILE_SIZE = 78;

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
                    playable ? theme.popShadow(color) : styles.cardDim
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
                    <AppText style={styles.name} numberOfLines={1}>
                        {name}
                    </AppText>

                    <View style={styles.chips}>
                        <Chip
                            text={`${minMaxPlayers} ${t('common.players')}`}
                            icon="user"
                        />
                        <Chip
                            text={t(DEVICE_MODE_KEYS[deviceMode])}
                            icon="smartphone"
                        />
                    </View>

                        <View style={styles.duration}>
                            <Feather
                                name="clock"
                                size={13}
                                color={theme.colors.textMuted}
                            />
                            <AppText style={styles.durationText}>
                                +-{durationInMinutes} {t("common.minutes")}
                            </AppText>
                        </View>

                    {description && (
                        <View style={styles.status}>
                            <AppText style={styles.statusText}>
                                {description}
                            </AppText>
                        </View>
                    )}
                </View>

                <View style={styles.play}>
                    <Feather
                        name="play"
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
    // The SVG icons draw their own background, border and glyph, so this is sized and
    // rounded to match `tile` without repeating either.
    icon: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        borderRadius: 20
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
    duration: {
        marginTop: Spacing.two,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    durationText: {
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textMuted
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
        backgroundColor: theme.scheme === 'dark'
            ? theme.colors.mint
            : theme.colors.available
    },
    statusText: {
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    device: {
        marginTop: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    deviceText: {
        flexShrink: 1,
        fontSize: 11,
        fontWeight: 700,
        // A step quieter than the description above it: how many phones to bring is a
        // practical note you read once, not part of the pitch.
        color: theme.colors.textMuted
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
        backgroundColor: theme.scheme === 'dark'
            ? theme.colors.lemon
            : theme.colors.text
    },
    soon: {
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark'
            ? theme.colors.lemon
            : theme.colors.border,
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