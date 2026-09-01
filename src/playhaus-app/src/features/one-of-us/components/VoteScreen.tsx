import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import ValidateButton from "@/components/ui/ValidateButton";
import { Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import SeatRing from "@/features/one-of-us/components/SeatRing";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

interface Props {
    busy: boolean
    chosen: number | null
    error: TranslationKey | null
    onChoose: (seat: number) => void
    onConfirm: () => void
    seats: Seat[]
}


export default function VoteScreen({
    busy,
    chosen,
    error,
    onChoose,
    onConfirm,
    seats
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const picked = seats.find(seat => seat.seat === chosen) ?? null;

    return (
        <View style={styles.screen}>
            <SimpleTextHero
                title={t('oneOfUs.play.vote.title')}
                description={t('oneOfUs.play.vote.description')}
            />

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(error)}
                />
            )}

            {/* The middle is the receipt for the tap: it names whoever was picked, from
                a metre away, so the person holding the phone does not have to find the
                one seat that grew. Before anything is picked it says so plainly rather
                than sitting empty. */}
            <SeatRing
                seats={seats}
                markOf={seat => seat.seat === chosen ? 'chosen' : 'normal'}
                label={picked === null ? undefined : t('oneOfUs.play.vote.ringChosen')}
                headline={picked === null
                    ? t('oneOfUs.play.vote.nobody')
                    : picked.name}
                onPick={seat => onChoose(seat.seat)}
                disabled={busy}
            />

            <View style={styles.footer}>
                <ValidateButton
                    label={picked === null
                        ? t('oneOfUs.play.vote.nobody')
                        : t('oneOfUs.play.vote.confirm', { name: picked.name })}
                    hint={picked === null
                        ? t('oneOfUs.play.vote.locked')
                        : t('oneOfUs.play.vote.confirmHint')}
                    unlocked={picked !== null && !busy}
                    onPress={onConfirm}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    screen: {
        flex: 1,
        width: '100%',
        paddingTop: Spacing.three,
        gap: Spacing.three
    },

    footer: {
        marginTop: 'auto',
        paddingTop: Spacing.two
    }
}))
