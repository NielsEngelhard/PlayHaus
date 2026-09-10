import InGameHeader, { type SegmentState } from "@/components/ui/InGameHeader";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { View } from "react-native";

/** Everything the strip says about the turn, which is everything about it that is not the question. */
export interface ControlTurn {
    /** Who has to answer it, or null in the rounds where nobody in particular does. */
    answering: Seat | null
    /** What the strip says instead, when `answering` is null. */
    lead: string
    /** 1-based: question 3 of 8. */
    number: number
    quizmaster: Seat
    round: number
    run: number
    total: number
    worth: number
}

interface Props {
    children: ReactNode
    label: string
    onClose: () => void
    segments: SegmentState[]
    /** The turn as the room knows it, and null on a phone whose own board draws the strip. */
    turn: ControlTurn | null
}

// The top of every controller: the way out, where the evening has got to, and the turn.
export default function ControlFrame({ children, label, onClose, segments, turn }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.board}>
            <InGameHeader
                onClose={onClose}
                closeLabel={t('pubquizr.play.close')}
                label={label}
                segments={segments}
            />

            {turn !== null && <TurnStrip {...turn} />}

            {children}
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    board: {
        flex: 1,
        width: '100%',
        gap: Spacing.three - 4,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    }
}))
