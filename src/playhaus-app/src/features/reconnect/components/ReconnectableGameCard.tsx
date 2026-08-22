import type { ReconnectableGame } from "@/api/calls/reconnect";
import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
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

/**
 * The look a row falls back on when its slug is not in the game registry — which
 * only happens if the two ever drift apart. A card with no tile at all would read
 * as broken; one in the house orange reads as a game.
 */
const UNKNOWN_GAME = {
    color: Brand.primary,
    gradient: Gradients.primary,
    glyphInk: { light: Brand.textOnAccent, dark: Brand.ink }
};

/**
 * One game you can drop back into: what it is on top, the way back in underneath.
 *
 * The card itself is not tappable. Every row here is a jump straight back into a
 * game in progress, which is not something to do by brushing a card — so there is
 * one button, and it is the loudest thing on the row.
 *
 * The tile is the game's own, read out of `GAMES`: the thing you are being offered
 * back should look like the thing you started.
 */
export default function ReconnectableGameCard({ game, kind }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();
    const t = useT();
    const phrase = usePhrase();

    const registered = gameBySlug(kind.slug);
    const look = registered ?? UNKNOWN_GAME;

    // A lobby is headed by its own name, "Lobby K2V8", and says which game it is in
    // the chips underneath. A solo game has no name but the game's, so it leads with
    // that and the chips carry the mode instead.
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
                            <View key={chip} style={styles.chip}>
                                <AppText style={styles.chipText}>{chip}</AppText>
                            </View>
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
    chip: {
        borderWidth: 1.5,
        borderColor: theme.colors.borderSubtle,
        borderRadius: 999,
        paddingVertical: 2,
        paddingHorizontal: 8
    },
    chipText: {
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    button: {
        marginTop: 13,
        width: '100%'
    }
}))
