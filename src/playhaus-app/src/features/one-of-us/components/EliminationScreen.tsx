import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import PinButton from "@/features/one-of-us/components/PinButton";
import RoleVerdict from "@/features/one-of-us/components/RoleVerdict";
import SeatRing from "@/features/one-of-us/components/SeatRing";
import { OneOfUsRole } from "@/features/one-of-us/models";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** The round about to start. */
    nextRound: number
    onNext: () => void
    person: Seat
    remaining: number
    role: OneOfUsRole
    seats: Seat[]
}


export default function EliminationScreen({
    nextRound,
    onNext,
    person,
    remaining,
    role,
    seats
}: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.screen}>
            <View style={styles.middle}>
                <SeatRing
                    seats={seats}
                    markOf={seat => seat.seat === person.seat ? 'out' : 'muted'}
                    label={t('oneOfUs.play.elimination.ringLabel')}
                    headline={person.name}
                />

                <RoleVerdict name={person.name} role={role} style={styles.verdict} />

                <AppText style={styles.remaining}>
                    {t('oneOfUs.play.elimination.remaining', { players: remaining })}
                </AppText>
            </View>

            <PinButton
                icon="arrow-right"
                text={t('oneOfUs.play.elimination.next', { round: nextRound })}
                onPress={onNext}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },

    middle: {
        flex: 1,
        alignItems: 'stretch',
        justifyContent: 'center'
    },

    verdict: {
        marginTop: Spacing.four
    },

    remaining: {
        marginTop: 18,
        fontSize: 13.5,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textMuted
    }
}))
