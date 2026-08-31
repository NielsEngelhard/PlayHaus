import AppText from "@/components/text/AppText";
import { Brand, withAlpha } from "@/constants/theme";
import type { WordLength } from "@/features/league-of-letters/solo-settings";
import { StyleSheet, View } from "react-native";

interface Props {
    /** How many tiles the round will deal — the one setting this preview stages. */
    wordLength: WordLength
}

/**
 * The letter the first tile shows. Pure decoration: no word exists yet at setup — the
 * server deals one when the game starts — so this is a hint of what the board will look
 * like, not a peek at it. Any letter would do; 'S' starts more words than most.
 */
const SAMPLE_LETTER = 'S';

/**
 * A row of letter tiles on the settings band, one per letter of the configured length.
 *
 * The word-length picker's live consequence: drag it to 8 and the row grows to 8. The
 * first tile is filled in to say "letters go here"; the rest are dashed outlines,
 * because empty-and-waiting is exactly what they are.
 *
 * Drawn entirely in `Brand` constants — it only ever sits on the game's orange band,
 * which is scheme-invariant, so a module-scope sheet is safe here where it would not be
 * in a themed component.
 */
export default function BoardPreview({ wordLength }: Props) {
    /*
     * Tiles shrink as the word grows so eight of them still fit a narrow phone: the
     * band keeps ~18dp padding a side, so 8×34 + 7×6 = 314 clears a 360dp window.
     * Stepped rather than measured — three fixed sizes keep the row from wobbling by a
     * fraction of a pixel every time the length changes.
     */
    const width = wordLength >= 8 ? 34 : wordLength === 7 ? 38 : 46;
    const height = Math.round(width * 1.15);

    return (
        <View style={styles.row}>
            {Array.from({ length: wordLength }, (_, i) => (
                i === 0 ? (
                    <View key={i} style={[styles.tile, styles.filled, { width, height }]}>
                        <AppText style={styles.letter}>{SAMPLE_LETTER}</AppText>
                    </View>
                ) : (
                    <View key={i} style={[styles.tile, styles.empty, { width, height }]} />
                )
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6
    },
    tile: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 2
    },
    filled: {
        backgroundColor: Brand.lemon,
        borderColor: Brand.ink
    },
    // Paper washes, not ink ones: on the saturated orange band a pale ghost of a tile
    // reads as "empty slot", where a dark one would read as a second kind of key.
    empty: {
        backgroundColor: withAlpha(Brand.textOnAccent, 0.22),
        borderColor: withAlpha(Brand.textOnAccent, 0.6),
        borderStyle: 'dashed'
    },
    letter: {
        fontSize: 22,
        fontWeight: 900,
        color: Brand.ink
    }
})
