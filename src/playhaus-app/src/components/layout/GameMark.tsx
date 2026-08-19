import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** The game's initial, drawn large in the tile. */
    letter: string,
    /** The game's accent, worn as a notch in the top-right corner. */
    accent: string,
    /** Read aloud in place of the letter, which on its own says nothing. */
    label: string
}

const SIZE = 34;

/**
 * A game's own square mark, for the right of the header on its front page.
 *
 * Stands in for `ContextPill` there rather than beside it. On a game's hub the name is
 * already set 32pt in the hero directly below, so a pill repeating it in 11pt caps is the
 * same word twice — the mark says the same thing without saying it.
 *
 * Drawn from views rather than from the brand SVG: there is no SVG renderer in the
 * bundle, and the shape is a rounded square, a corner notch and a letter, all of which a
 * clipped `View` does natively.
 */
export default function GameMark({ letter, accent, label }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.tile} accessibilityRole='image' accessibilityLabel={label}>
            {/* Clipped by the tile's own radius, so it reads as a slice taken out of the
                corner rather than as a square sitting on top of one. */}
            <View style={[styles.notch, { backgroundColor: accent }]} />

            <AppText style={styles.letter}>{letter}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    tile: {
        width: SIZE,
        height: SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        // Clips the notch. Everything else in the tile is already inside it.
        overflow: 'hidden',
        // Matches the wordmark opposite it, so the two ends of the row sit at one height.
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    notch: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '38%',
        height: '40%'
    },
    letter: {
        fontSize: 23,
        fontWeight: 900,
        color: theme.colors.text
    }
}))
