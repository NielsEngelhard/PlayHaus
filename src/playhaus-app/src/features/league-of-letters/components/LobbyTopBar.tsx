import { MAX_LOBBY_PLAYERS } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";

interface Props {
    /** The join code, as the server issued it. Drawn one character to a tile. */
    code: string,
    /** How many are in the room. Counted against `MAX_LOBBY_PLAYERS`, never passed in. */
    players: number
}

const GAP = Spacing.one + 2;

/** Below this the code stops being readable across a table; above it, it crowds the pill. */
const MIN_TILE = 22;
const MAX_TILE = 38;

/**
 * The largest tile that fits every character on one line of the space left over.
 *
 * Measured off the row the tiles are in rather than the card: the pill beside them has
 * already taken its width by the time this is asked, and six tiles at a fixed size do not
 * fit what is left on a narrow phone.
 */
function fittedTileSize(width: number, characters: number): number {
    if (width <= 0 || characters === 0) return 0;

    const byWidth = (width - GAP * (characters - 1)) / characters;

    return Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(byWidth)));
}

/**
 * The two things about a room that have to stay readable while you scroll it: the code to
 * read out, and how full the room is.
 *
 * Pinned by the screen rather than by this component — `LobbyView` claims the viewport and
 * puts its scroller underneath. Sits square, with no house tilt: everything else on the
 * page moves past it, and an off-square element that never moves reads as a mistake rather
 * than as the style.
 */
export default function LobbyTopBar({ code, players }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const [width, setWidth] = useState(0);

    const characters = [...code];
    const size = fittedTileSize(width, characters.length);

    function measure(event: LayoutChangeEvent) {
        const next = event.nativeEvent.layout.width;
        setWidth(current => (current === next ? current : next));
    }

    return (
        <Card style={styles.card}>
            <AppText style={styles.label}>Join code</AppText>

            <View style={styles.row}>
                <View
                    style={styles.tiles}
                    onLayout={measure}
                    accessibilityRole='text'
                    // Spelled out one character at a time: read as a word, a six-letter
                    // code comes out of a screen reader as noise.
                    accessibilityLabel={`Join code: ${characters.join(' ')}`}
                >
                    {/* Nothing to draw until the first layout pass has said how much room
                        there is — a tile sized off zero would be laid out and resized. */}
                    {size > 0 && characters.map((character, index) => (
                        <View
                            key={index}
                            style={[
                                styles.tile,
                                {
                                    width: size,
                                    height: size,
                                    // Scales with the tile, so a small code is not a lozenge.
                                    borderRadius: Math.min(10, Math.round(size * 0.28))
                                }
                            ]}
                        >
                            <AppText
                                style={[
                                    styles.character,
                                    { fontSize: Math.max(FontSizes.sm, Math.round(size * 0.55)) }
                                ]}
                            >
                                {character}
                            </AppText>
                        </View>
                    ))}
                </View>

                <View
                    style={styles.players}
                    accessibilityRole='text'
                    accessibilityLabel={`${players} van ${MAX_LOBBY_PLAYERS} spelers`}
                >
                    <Feather name='users' size={16} color={theme.colors.text} />

                    <AppText style={styles.count}>{players}/{MAX_LOBBY_PLAYERS}</AppText>
                </View>
            </View>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Tighter than a `Card`'s standing padding: this is chrome the page scrolls under,
    // and every point of height it takes is a point the room below it loses.
    card: {
        padding: Spacing.three
    },
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    row: {
        marginTop: Spacing.two,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },
    tiles: {
        // Takes the room the pill does not, which is also the width the tiles size against.
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        gap: GAP,
        minHeight: MIN_TILE
    },
    tile: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        // Lemon, the colour a chosen tile wears everywhere else in this game.
        backgroundColor: theme.colors.lemon,
        ...theme.shadows.hardSmall
    },
    character: {
        fontWeight: 900,
        // Outfit Black is wide; without pulling it in, a full tile touches its own border.
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    // The app's chrome is made of hard-bordered pills; this is one more of them.
    players: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two + 2,
        backgroundColor: theme.colors.background,
        ...theme.shadows.hardSmall
    },
    count: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        // The left-hand digit changes as people arrive; without this the pill twitches.
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    }
}))
