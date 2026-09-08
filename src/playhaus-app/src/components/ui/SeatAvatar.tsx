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

// A player, as a coloured circle with their initials in it.
export default function SeatAvatar({ seat, size, raised = false, style }: Props) {
    // Ratios read off the sizes these were written at by hand.
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
