import type { ReconnectableGame } from "@/api/calls/reconnect";
import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import Chip from "@/components/ui/Chip";
import { gameBySlug } from "@/constants/games";
import { Brand, Gradients, linearGradient } from "@/constants/theme";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import { startedAgo, type GameKind } from "@/features/reconnect/game-kinds";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useRouter } from "expo-router";
import { View } from "react-native";

interface Props {
    game: ReconnectableGame
    /** What this type of game is called and where its button goes. */
    kind: GameKind
}

const TILE_SIZE = 58;

const UNKNOWN_GAME = {
    color: Brand.primary,
    gradient: Gradients.primary,
    glyphInk: { light: Brand.textOnAccent, dark: Brand.ink }
};

export default function ReconnectableGameCard({ game, kind }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();
    const t = useT();
    const phrase = usePhrase();

    const registered = gameBySlug(kind.slug);
    const look = registered ?? UNKNOWN_GAME;

    const code = kind.code?.(game);
    const started = startedAgo(game.createdAt);

    const chips = [
        code === undefined ? t(kind.modeKey) : kind.title,
        started === null ? null : phrase(started)
    ].filter((chip): chip is string => chip !== null);

    return (
        <View style={[styles.card, theme.popShadow(look.color)]}>
            <View style={styles.row}>
                <View style={[styles.tile, linearGradient(look.gradient)]}>
                    <AppText style={[styles.glyph, { color: look.glyphInk[theme.scheme] }]}>
                        {(registered?.name ?? kind.title)[0]}
                    </AppText>
                </View>

                <View style={styles.body}>
                    <AppText style={styles.title} numberOfLines={1}>
                        {code === undefined ? kind.title : t('lol.lobby.named', { code })}
                    </AppText>

                    <View style={styles.chips}>
                        {chips.map(chip => (
                            <Chip key={chip} text={chip} />
                        ))}
                    </View>
                </View>
            </View>

            <ActionButton
                text={t('reconnect.resume')}
                onPress={() => router.push(kind.href(game))}
                style={styles.button}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        padding: 14
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13
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
        borderColor: theme.colors.border,
        // A lit top edge, so the tile reads as domed rather than printed.
        boxShadow: 'inset 0 2px 0 rgba(255, 255, 255, 0.35)'
    },
    glyph: {
        fontSize: 26,
        fontWeight: 900
    },
    body: {
        // Without this the text column refuses to shrink and pushes the tile off the
        // card on a narrow screen.
        flex: 1,
        minWidth: 0
    },
    title: {
        fontSize: 17,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    chips: {
        marginTop: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5
    },
    button: {
        marginTop: 13,
        width: '100%'
    }
}))
