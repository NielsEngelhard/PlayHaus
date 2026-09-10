import TextHint from "@/components/text/TextHint";
import { useT } from "@/features/i18n/LanguageContext";
import ChoiceCard from "@/features/pubquizr/components/play/ChoiceCard";
import ScriptCard from "@/features/pubquizr/components/play/ScriptCard";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import type { HotSeatTurn } from "@/features/pubquizr/hot-seat";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Whoever is being asked, which is whose phone the answer is tapped on. */
    answering: Seat
    /** Which round this is, for the strip. */
    round: number
    turn: HotSeatTurn
}

// Round 2's quizmaster still reads the question and all four options out loud, and that is the whole of their job -- the answer is tapped on somebody else's phone.
export default function ChoiceReadOut({ answering, round, turn }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.turn}>
            <TurnStrip
                quizmaster={turn.quizmaster}
                answering={answering}
                lead=""
                run={0}
                round={round}
                number={turn.number}
                total={turn.total}
                worth={turn.worth}
            />

            <ScriptCard
                prompt={turn.question.prompt}
                cue={t('pubquizr.play.choice.readAll')}
            >
                {/* Never revealed: nobody judges anything on this phone, so the right one is not its business. */}
                <ChoiceCard options={turn.options} revealed={false} />
            </ScriptCard>

            <TextHint text={t('pubquizr.control.theyTapItThemselves', { name: answering.name })} />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // The middle of the board grows and everything else does not.
    turn: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
    }
}))
