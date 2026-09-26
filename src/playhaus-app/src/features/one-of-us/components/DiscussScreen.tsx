import ActionButton from "@/components/ui/ActionButton";
import { useT } from "@/features/i18n/LanguageContext";
import VoteBoard from "@/features/one-of-us/components/VoteBoard";
import type { Seat } from "@/features/table/seats";

interface Props {
    mayor: Seat | null
    // A name tapped while still talking goes straight into the vote as its pick.
    onChoose: (seat: number) => void
    onLeave: () => void
    onVote: () => void
    out: Seat[]
    round: number
    seats: Seat[]
}

// The table talking it over, on the same board it is about to vote on.
export default function DiscussScreen({ mayor, onChoose, onLeave, onVote, out, round, seats }: Props) {
    const t = useT();

    return (
        <VoteBoard
            label={t('oneOfUs.play.roundDiscuss', { round })}
            seats={seats}
            out={out}
            mayor={mayor}
            chosen={null}
            onChoose={onChoose}
            onLeave={onLeave}
            footer={(
                <ActionButton
                    text={t('oneOfUs.play.discuss.action')}
                    onPress={onVote}
                />
            )}
        />
    )
}
