import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { OneOfUsRole, withCivilians } from "@/features/one-of-us/models";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    person: Seat
    role: OneOfUsRole
    /** How many are still in, after this one left. */
    remaining: number
    /** The round about to start. */
    nextRound: number
    onNext: () => void
}

/**
 * What the table is told the moment somebody goes.
 *
 * A whole screen, because this is the only information the game ever gives back. Every
 * other thing the table knows it worked out by listening to each other; this is the one
 * fact handed down, and it is what the next round is argued from. Putting it in a
 * banner over the next screen would let it be scrolled past by whoever taps fastest.
 *
 * The role is stated plainly rather than teased. A reveal that made you wait would be
 * playing a different game than the table is: they have just spent a round on this
 * exact question and the answer is the payoff, not a cliffhanger.
 *
 * Three verdicts, not two. The nitwit plays for the imposters, so calling them a
 * civilian here would be telling the table the round went the other way than it did —
 * and it gets its own line and its own colour rather than being folded into "imposter",
 * because catching somebody who never had the word is a different result to argue the
 * next round from than catching somebody who did.
 */
export default function EliminationScreen({
    person,
    role,
    remaining,
    nextRound,
    onNext
}: Props) {
    const t = useT();
    const styles = useStyles();

    const caught = !withCivilians(role);
    const nitwit = role === OneOfUsRole.Nitwit;

    return (
        <View style={styles.screen}>
            <View style={styles.middle}>
                <SeatAvatar seat={person} size={112} raised style={styles.avatar} />

                <AppText style={styles.title}>
                    {t('oneOfUs.play.elimination.title', { name: person.name })}
                </AppText>

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

    avatar: {
        // Dimmed: this person is out of the game, and the avatar should not look as
        // present as the ones on the turn screens.
        opacity: 0.75
    },

    title: {
        marginTop: 24,
        fontSize: 36,
        fontWeight: 900,
        lineHeight: 36 * 1.05,
        letterSpacing: -1.4,
        textAlign: 'center',
        color: theme.colors.text
    },

    verdict: {
        marginTop: 20,
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
