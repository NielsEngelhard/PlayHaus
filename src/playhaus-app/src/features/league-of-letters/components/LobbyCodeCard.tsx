import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

interface Props {
    /** The join code, as the server issued it. Drawn one character to a tile. */
    code: string,
    /** The line under the tiles. Left out for a room you joined rather than opened. */
    hint?: string
}

const GAP = Spacing.two;

/** Below this the code stops being readable across a table; above it, it stops fitting. */
const MIN_TILE = 30;
const MAX_TILE = 64;

/**
 * The largest tile that fits every character on one line.
 *
 * Measured off the card's inner width rather than the window: on web the page is capped
 * at 600 and the card has padding of its own, so the window would size these far too big.
 */
function fittedTileSize(width: number, characters: number): number {
    if (width <= 0 || characters === 0) return 0;

    const byWidth = (width - GAP * (characters - 1)) / characters;

    return Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(byWidth)));
}

/**
 * The join code, as big as the card will allow.
 *
 * This is what the screen is for: everything else in a lobby can be worked out by
 * looking, but the code has to be read off someone's phone and typed into another. So it
 * gets the board's own letter tiles rather than a line of text — same tiles the game is
 * played on, in the accent the room is opened from.
 */
export default function LobbyCodeCard({ code, hint }: Props) {
    const [width, setWidth] = useState(0);

    const characters = [...code];
    const size = fittedTileSize(width, characters.length);

    function measure(event: LayoutChangeEvent) {
        const next = event.nativeEvent.layout.width;
        setWidth(current => (current === next ? current : next));
    }

    return (
        <Card>
            <AppText style={styles.label}>Join code</AppText>

            <View
                style={styles.row}
                onLayout={measure}
                accessibilityRole='text'
                // Spelled out one character at a time: read as a word, a six-letter code
                // comes out of a screen reader as noise.
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
                                borderRadius: Math.min(14, Math.round(size * 0.28))
                            }
                        ]}
                    >
                        <AppText
                            style={[
                                styles.character,
                                { fontSize: Math.max(FontSizes.lg, Math.round(size * 0.55)) }
                            ]}
                        >
                            {character}
                        </AppText>
                    </View>
                ))}
            </View>

            {hint && <AppText style={styles.hint}>{hint}</AppText>}
        </Card>
    )
}

const styles = StyleSheet.create({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    },
    row: {
        marginTop: Spacing.three,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: GAP,
        // The tiles are measured against this box, so it has to be the full width of the
        // card whether or not there is anything in it yet.
        width: '100%',
        minHeight: MIN_TILE
    },
    tile: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        // Lemon, the colour a chosen tile wears everywhere else in this game.
        backgroundColor: Colors.light.lemon,
        ...Shadows.hardLarge
    },
    character: {
        fontWeight: 900,
        // Outfit Black is wide; without pulling it in, a full tile touches its own border.
        letterSpacing: -0.5,
        color: Colors.light.text
    },
    hint: {
        marginTop: Spacing.three,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        color: Colors.light.textSecondary
    }
})
