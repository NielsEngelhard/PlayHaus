import ActionButton from "@/components/ui/ActionButton";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import VoteBoard from "@/features/one-of-us/components/VoteBoard";
import type { Seat } from "@/features/table/seats";

interface Props {
    busy: boolean
    chosen: number | null
    error: TranslationKey | null
    mayor: Seat | null
    onChoose: (seat: number) => void
    onConfirm: () => void
    onLeave: () => void
    out: Seat[]
    round: number
    seats: Seat[]
}

// The vote: the table taps one name and sends that player away.
export default function VoteScreen({
    busy,
    chosen,
    error,
    mayor,
    onChoose,
    onConfirm,
    onLeave,
    out,
    round,
    seats
}: Props) {
    const t = useT();

    const picked = seats.find(seat => seat.seat === chosen) ?? null;

    return (
        <VoteBoard
            label={t('oneOfUs.play.vote.bandLabel', { round })}
            seats={seats}
            out={out}
            mayor={mayor}
            chosen={chosen}
            onChoose={onChoose}
            onLeave={onLeave}
            disabled={busy}
            error={error}
            footer={(
                <ActionButton
                    icon={picked === null ? 'lock' : 'arrow-right'}
                    text={picked === null
                        ? t('oneOfUs.play.vote.pickFirst')
                        : t('oneOfUs.play.vote.sendAway', { name: picked.name })}
                    disabled={picked === null || busy}
                    onPress={onConfirm}
                />
            )}
        />
    )
}
