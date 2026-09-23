import TextHint from "@/components/text/TextHint";
import InGameHeader, { type SegmentState } from "@/components/ui/InGameHeader";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState, type ReactNode } from "react";
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
    /** Centres the children on the whole phone rather than on the room left under the band. */
    centered?: boolean
    children: ReactNode
    /** The band's right-hand slot: the screen pill, when the table has a screen. */
    chip?: ReactNode
    label: string
    /** One line under the band, for a phone whose job the screen has taken over. */
    note?: string
    onClose: () => void
    segments: SegmentState[]
    /** The turn as the room knows it, and null on a phone whose own board draws the strip. */
    turn: ControlTurn | null
}

// The top of every controller: the way out, where the evening has got to, and the turn.
export default function ControlFrame({ centered, children, chip, label, note, onClose, segments, turn }: Props) {
    const styles = useStyles();
    const t = useT();

    const [top, setTop] = useState(0);

    return (
        <View style={styles.board}>
            <View style={styles.top} onLayout={event => setTop(event.nativeEvent.layout.height)}>
                <InGameHeader
                    onClose={onClose}
                    closeLabel={t('pubquizr.play.close')}
                    label={label}
                    // A note reads right under the band, which the fill would otherwise run across.
                    overlap={note === undefined ? undefined : 0}
                    segments={segments}
                >
                    {chip}
                </InGameHeader>

                {note !== undefined && <TextHint text={note} />}

                {turn !== null && <TurnStrip {...turn} />}
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
        gap: Spacing.three - 4,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    top: {
        gap: Spacing.three - 4
    },

    balance: {
        flexShrink: 1
    }
}))
