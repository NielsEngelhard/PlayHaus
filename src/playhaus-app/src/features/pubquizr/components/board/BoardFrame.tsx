import InGameHeader, { type SegmentState } from "@/components/ui/InGameHeader";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

interface Props {
    /** Centres the children on the whole phone rather than on the room left under the band. */
    centered?: boolean
    children: ReactNode
    label: string
    onClose: () => void
    segments: SegmentState[]
    /** The `TurnOrderStrip`, pulled up over the band's bottom edge, or null on a screen that has none. */
    strip: ReactNode | null
}

// The phone shell when there is no shared screen: band, turn order, and a board underneath that each round fills in.
export default function BoardFrame({ centered, children, label, onClose, segments, strip }: Props) {
    const styles = useStyles();
    const t = useT();

    const [top, setTop] = useState(0);

    return (
        <View style={styles.board}>
            <View onLayout={event => setTop(event.nativeEvent.layout.height)}>
                {/* No fill running on below the band: the strip sits across its edge instead. */}
                <InGameHeader
                    onClose={onClose}
                    closeLabel={t('pubquizr.play.close')}
                    label={label}
                    segments={segments}
                    overlap={0}
                />

                {strip !== null && <View style={styles.strip}>{strip}</View>}
            </View>

            {children}

            {/* Mirrors the band so the children's middle is the phone's middle, and gives way first when the phone is short. */}
            {centered && <View style={[styles.balance, { height: top }]} />}
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    board: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    strip: {
        marginTop: -Spacing.three
    },

    balance: {
        flexShrink: 1
    }
}))
