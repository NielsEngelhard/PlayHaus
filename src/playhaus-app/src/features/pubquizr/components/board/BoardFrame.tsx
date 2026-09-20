import InGameHeader, { type SegmentState } from "@/components/ui/InGameHeader";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { View } from "react-native";

interface Props {
    children: ReactNode
    label: string
    onClose: () => void
    segments: SegmentState[]
    /** The `TurnOrderStrip`, pulled up over the band's bottom edge, or null on a screen that has none. */
    strip: ReactNode | null
}

// The phone shell when there is no shared screen: band, turn order, and a board underneath that each round fills in.
export default function BoardFrame({ children, label, onClose, segments, strip }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.board}>
            {/* No fill running on below the band: the strip sits across its edge instead. */}
            <InGameHeader
                onClose={onClose}
                closeLabel={t('pubquizr.play.close')}
                label={label}
                segments={segments}
                overlap={0}
            />

            {strip !== null && <View style={styles.strip}>{strip}</View>}

            {children}
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
    }
}))
