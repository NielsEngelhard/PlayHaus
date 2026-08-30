import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import AnswerReveal from "@/components/ui/AnswerReveal";
import HandoffScreen from "@/components/ui/HandoffScreen";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import RoleCard from "@/features/one-of-us/components/RoleCard";
import type { OneOfUsRole } from "@/features/one-of-us/models";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    person: Seat
    /** Who is handing the phone over, or null for the very first player. */
    from: Seat | null
    /** The word this player is playing on — theirs alone. */
    word: string
    /** Which side they are on, uncovered with the word and hidden again with it. */
    role: OneOfUsRole
    number: number
    total: number
    onDone: () => void
}

/**
 * One player's word, handed over privately.
 *
 * Two screens rather than one, and the hand-off in front is the half that matters: this
 * is the only moment in the game where the phone shows something that belongs to one
 * person, so it has to be impossible to reach by accident. `HandoffScreen` is the wall,
 * and it does not come down until somebody claims to be the person named on it.
 *
 * Behind it the word stays covered until tapped — a second deliberate act, because
 * "claimed the phone" and "is holding it at an angle nobody else can read" are not the
 * same thing. See `SecretCard`.
 *
 * Uncovering it uncovers the role with it, on a card of its own underneath. The two are
 * one secret: a word means nothing until you know whether yours is the odd one out, and
 * an imposter who has to work that out during round one has already lost the round
 * working it out. Covering the word again takes the role card back down with it — both
 * halves are equally worth hiding from whoever is leaning over.
 *
 * The way on only appears once the word has been seen. A player who passes the phone on
 * without reading their word has no way back to it, and the game gives them nothing to
 * bluff with. It stays put after the word is covered again: `seen` is what earns it, and
 * putting the secret away is not a reason to take the exit back.
 */
export default function WordRevealScreen({
    person,
    from,
    word,
    role,
    number,
    total,
    onDone
}: Props) {
    const t = useT();
    const styles = useStyles();

    const [claimed, setClaimed] = useState(false);
    /** Ever uncovered — the way on. */
    const [seen, setSeen] = useState(false);
    /** Uncovered right now — the role card. */
    const [open, setOpen] = useState(false);

    if (!claimed) {
        return (
            <HandoffScreen
                person={person}
                from={from}
                toneNumber={number}
                step={t('oneOfUs.play.reveal.step', { number, total })}
                title={t('oneOfUs.play.reveal.title', { name: person.name })}
                body={t('oneOfUs.play.reveal.body', { name: person.name })}
                note={t('oneOfUs.play.reveal.note')}
                action={t('oneOfUs.play.reveal.action', { name: person.name })}
                onReady={() => setClaimed(true)}
            />
        )
    }

    const last = number === total;

    return (
        <View style={styles.screen}>
            <AppText style={styles.step}>
                {t('oneOfUs.play.reveal.step', { number, total })}
            </AppText>

            <AppText style={styles.name}>{person.name}</AppText>

            <AnswerReveal
                key={person.seat}
                answer={word}
                onReveal={() => {
                    setSeen(true);
                    setOpen(true);
                }}
                onHide={() => setOpen(false)}
                extraContent={<RoleCard role={role} style={styles.role} />}
            />

            <View style={styles.footer}>
                {seen && (
                    <ActionButton
                        size="large"
                        icon={last ? 'play' : 'arrow-right'}
                        text={last
                            ? t('oneOfUs.play.reveal.lastDone')
                            : t('oneOfUs.play.reveal.done')}
                        onPress={onDone}
                    />
                )}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%',
        paddingTop: Spacing.four
    },

    step: {
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textMuted
    },

    name: {
        marginTop: 10,
        fontSize: 34,
        fontWeight: 900,
        letterSpacing: -1.2,
        color: theme.colors.text
    },

    role: {
        marginTop: 10
    },

    // Holds the button's height whether or not it is showing, so uncovering the word
    // does not shift the card that was just tapped.
    footer: {
        marginTop: 'auto',
        minHeight: 66,
        justifyContent: 'flex-end'
    }
}))
