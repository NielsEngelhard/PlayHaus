import AppText from "@/components/text/AppText";
import { Brand, withAlpha } from "@/constants/theme";
import { MIN_PLAYERS } from "@/features/one-of-us/oou-settings";
import { initialsOf } from "@/features/table/seats";
import { colorForSeat } from "@/utils/color-utils";
import { StyleSheet, View } from "react-native";

interface Props {
    /** The name fields as typed, empty strings included — an empty one is an open seat. */
    names: string[]
}

/** The ring's box; the dots' centres sit on a circle of `RADIUS` inside it. */
const SIZE = 110;
const RADIUS = 40;
const DOT = 26;

// The circle One of Us is played in, on the settings band: one dot per player, dealt round a ring.
export default function TableRingPreview({ names }: Props) {
    const seats = Math.max(names.length, MIN_PLAYERS);

    return (
        <View style={styles.ring}>
            {Array.from({ length: seats }, (_, i) => {
                // First seat at twelve o'clock, the rest dealt clockwise.
                const angle = (-90 + (i * 360) / seats) * (Math.PI / 180);
                const position = {
                    left: SIZE / 2 + RADIUS * Math.cos(angle) - DOT / 2,
                    top: SIZE / 2 + RADIUS * Math.sin(angle) - DOT / 2
                };

                const name = names[i]?.trim() ?? '';

                if (name === '') {
                    return <View key={i} style={[styles.dot, styles.empty, position]} />
                }

                const swatch = colorForSeat(i);

                return (
                    <View key={i} style={[styles.dot, styles.filled, position, { backgroundColor: swatch.color }]}>
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
    ring: {
        width: SIZE,
        height: SIZE
    },
    dot: {
        position: 'absolute',
        width: DOT,
        height: DOT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999
    },
    filled: {
        borderWidth: 2,
        borderColor: Brand.ink
    },
    // Ink washes, unlike the paper ones the other previews use.
    empty: {
        backgroundColor: withAlpha(Brand.ink, 0.08),
        borderWidth: 2,
        borderColor: withAlpha(Brand.ink, 0.35),
        borderStyle: 'dashed'
    },
    initials: {
        fontSize: 10,
        fontWeight: 900
    }
})
