import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import SeatRing from "@/features/one-of-us/components/SeatRing";
import { OneOfUsRole, withCivilians } from "@/features/one-of-us/models";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
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

    const caught = !withCivilians(role);
    const nitwit = role === OneOfUsRole.Nitwit;

    return (
        <View style={styles.screen}>
            <View style={styles.middle}>
                <SeatRing
                    seats={seats}
                    markOf={seat => seat.seat === person.seat ? 'out' : 'muted'}
                    label={t('oneOfUs.play.elimination.ringLabel')}
                    headline={person.name}
                />

                {/* Orange for an imposter caught, lemon for the nitwit, mint for a
                    civilian lost — the same three colours the reveal dressed the roles
                    in. The colour is the headline: it says which way the round went
                    before the sentence under it has been read. */}
                <View
                    style={[
                        styles.verdict,
                        nitwit ? styles.nitwit : caught ? styles.caught : styles.lost
                    ]}
                >
                    <Feather
                        name={nitwit ? 'help-circle' : caught ? 'zap' : 'user'}
                        size={16}
                        color={Brand.ink}
                    />

                    <AppText style={styles.verdictText}>
                        {nitwit
                            ? t('oneOfUs.play.elimination.nitwit', { name: person.name })
                            : caught
                                ? t('oneOfUs.play.elimination.imposter', { name: person.name })
                                : t('oneOfUs.play.elimination.civilian', { name: person.name })}
                    </AppText>
                </View>

                <AppText style={styles.remaining}>
                    {t('oneOfUs.play.elimination.remaining', { players: remaining })}
                </AppText>
            </View>

            <ActionButton
                size="large"
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
        alignItems: 'center',
        justifyContent: 'center'
    },

    verdict: {
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingVertical: 11,
        paddingHorizontal: 15,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Brand.ink
    },

    caught: {
        backgroundColor: Brand.primary
    },

    lost: {
        backgroundColor: Brand.mint
    },

    nitwit: {
        backgroundColor: Brand.lemon
    },

    // Ink on both fills, which are the same colour in both schemes.
    verdictText: {
        flexShrink: 1,
        fontSize: 14,
        fontWeight: 900,
        color: Brand.ink
    },

    remaining: {
        marginTop: 18,
        fontSize: 13.5,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textMuted
    }
}))
