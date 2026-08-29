import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import type { Seat } from "@/features/table/seats";
import { View, type ViewStyle } from "react-native";

interface Props {
    seat: Seat
    /** Diameter. The initials are scaled from it, so one number sets the whole thing. */
    size: number
    /** The hard ink shadow the brand puts under a raised element. */
    raised?: boolean
    style?: ViewStyle
}

/**
 * A player, as a coloured circle with their initials in it.
 *
 * The same circle was written out at five sizes across the play screens — 132 on a
 * hand-off, 38 in its from/to pair, 36 in the standings, 26 in the turn strip, 20 in a
 * hand-off hint — each with its own copy of the border, the radius and the two type
 * rules. They only ever differed by diameter and whether they were lifted off the page,
 * so those are the two props and everything else is derived.
 *
 * The swatch is always the player's own, never the screen's tone: an avatar that took
 * the background's colour would stop saying who on exactly the screens that are about
 * one person. The ink border is what keeps it legible when the two happen to collide.
 */
export default function SeatAvatar({ seat, size, raised = false, style }: Props) {
    // Ratios read off the sizes these were written at by hand: the 132 portrait carried
    // 44pt initials and a 2pt rule, the 36 standings avatar carried 12pt.
    const fontSize = Math.round(size / 3);
    const borderWidth = size >= 48 ? 2 : 1.5;
    const shadow = Math.max(2, Math.round(size / 32));

    return (
        <View
            style={[
                {
                    width: size,
                    height: size,
                    flexShrink: 0,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: seat.swatch.color,
                    borderWidth,
                    borderColor: Brand.ink
                },
                raised && { boxShadow: `${shadow}px ${shadow}px 0 0 rgba(15, 13, 18, 1)` },
                style
            ]}
        >
            <AppText style={{ fontSize, fontWeight: 900, color: seat.swatch.foreground }}>
                {seat.initials}
            </AppText>
        </View>
    )
}
