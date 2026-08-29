import type { ReconnectableGame } from "@/api/calls/reconnect";
import AppText from "@/components/text/AppText";
import Chip from "@/components/ui/Chip";
import PopPressable from "@/components/ui/PopPressable";
import { gameBySlug } from "@/constants/games";
import { Brand, Gradients, linearGradient } from "@/constants/theme";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import { startedAgo, type GameKind } from "@/features/reconnect/game-kinds";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { View } from "react-native";

interface Props {
    game: ReconnectableGame
    /** What this type of game is called and where its button goes. */
    kind: GameKind
}

const TILE_SIZE = 52;
const PLAY_SIZE = 34;

const UNKNOWN_GAME = {
    color: Brand.primary,
    gradient: Gradients.primary,
    glyphInk: { light: Brand.textOnAccent, dark: Brand.ink }
};

/**
 * One game left running, as a row you walk back into.
 *
 * The whole row is the button, and the lemon disc on the right is what says so. It used
 * to be a full-width "continue playing" bar under the title, which made every row two
 * decisions tall — on a page whose entire subject is a short list of ways back in, the
 * list itself should be scannable in one look, and the only thing you can do to a row is
 * the thing the row is for.
 */
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

    const title = code === undefined ? kind.title : t('lol.lobby.named', { code });

    const chips = [
        code === undefined ? t(kind.modeKey) : kind.title,
        started === null ? null : phrase(started)
    ].filter((chip): chip is string => chip !== null);

    return (
        <PopPressable
            onPress={() => router.push(kind.href(game))}
            accessibilityRole='button'
            accessibilityLabel={t('reconnect.resume', { game: title })}
            style={[styles.card, theme.popShadow(look.color)]}
        >
            <View style={[styles.tile, linearGradient(look.gradient)]}>
                <AppText style={[styles.glyph, { color: look.glyphInk[theme.scheme] }]}>
                    {(registered?.name ?? kind.title)[0]}
                </AppText>
            </View>

            <View style={styles.body}>
                <AppText style={styles.title} numberOfLines={1}>{title}</AppText>

                <View style={styles.chips}>
                    {chips.map(chip => (
                        <Chip key={chip} text={chip} />
                    ))}
                </View>
            </View>

            <View style={styles.play}>
                <Feather name='play' size={15} color={Brand.ink} />
            </View>
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        padding: 12
    },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        borderRadius: 16,
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
        fontSize: 24,
        fontWeight: 900
    },
    body: {
        // Without this the text column refuses to shrink and pushes the tile off the
        // card on a narrow screen.
        flex: 1,
        minWidth: 0
    },
    title: {
        fontSize: 16.5,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    chips: {
        marginTop: 5,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5
    },
    // Not a button of its own — the row is the button. This is the arrowhead that says
    // which way the row goes, in the one colour the app uses for "go".
    play: {
        width: PLAY_SIZE,
        height: PLAY_SIZE,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon
    }
}))
