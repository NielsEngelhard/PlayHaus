import AppText from "@/components/text/AppText";
import { Brand, withAlpha } from "@/constants/theme";
import { initialsOf } from "@/features/table/seats";
import { colorForSeat } from "@/utils/color-utils";
import { StyleSheet, View } from "react-native";

interface Props {
    /**
     * The name fields as typed, empty strings included: an empty entry is a seat waiting
     * for a name and is drawn as one, so adding a field changes the band before anything
     * is typed into it.
     */
    names: string[]
}

const SEAT = 34;

/**
 * The table on the settings band: one swatch per name field, in the same seat colours
 * `PlayerSeats` will deal once the quiz starts.
 *
 * The name list's live consequence — type a name and a seat fills in above, in the
 * colour that player will keep for the whole game. Named seats are solid swatches with
 * initials; empty fields are dashed ghosts, same vocabulary as `BoardPreview`'s empty
 * tiles.
 *
 * `Brand`-only colours, module-scope sheet: this only ever sits on the game's blue
 * band, which no scheme changes.
 */
export default function TablePreview({ names }: Props) {
    return (
        <View style={styles.row}>
            {names.map((name, i) => {
                if (name.trim() === '') {
                    return <View key={i} style={[styles.seat, styles.empty]} />
                }

                const swatch = colorForSeat(i);

                return (
                    <View key={i} style={[styles.seat, styles.filled, { backgroundColor: swatch.color }]}>
                        <AppText style={[styles.initials, { color: swatch.foreground }]}>
                            {initialsOf(name)}
                        </AppText>
                    </View>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6
    },
    seat: {
        width: SEAT,
        height: SEAT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999
    },
    // The ink ring is what keeps the lemon and mint swatches from melting into the band
    // on the day a game's accent matches one of them.
    filled: {
        borderWidth: 2,
        borderColor: Brand.ink
    },
    empty: {
        backgroundColor: withAlpha(Brand.textOnAccent, 0.22),
        borderWidth: 2,
        borderColor: withAlpha(Brand.textOnAccent, 0.6),
        borderStyle: 'dashed'
    },
    initials: {
        fontSize: 12,
        fontWeight: 900
    }
})
