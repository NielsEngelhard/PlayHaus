import AppText from "@/components/text/AppText";
import { Brand, withAlpha } from "@/constants/theme";
import type { WordLength } from "@/features/league-of-letters/solo-settings";
import { StyleSheet, View } from "react-native";

interface Props {
    /** How many tiles the round will deal — the one setting this preview stages. */
    wordLength: WordLength
}

// The letter the first tile shows.
const SAMPLE_LETTER = 'S';

// A row of letter tiles on the settings band, one per letter of the configured length.
export default function BoardPreview({ wordLength }: Props) {
    // Tiles shrink as the word grows so eight of them still fit a narrow phone.
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
    // Paper washes, not ink ones: on the saturated orange band a pale ghost of a tile reads as "empty slot", where a dark one would read as a second kind of key.
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
