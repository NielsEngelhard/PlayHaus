import type { OOUAnswer, OOUGamePlayer, OOUReveal } from '@/api/calls/one-of-us-multi-device';
import AppText from '@/components/text/AppText';
import ActionButton from '@/components/ui/ActionButton';
import Card from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import EliminationScreen from '@/features/one-of-us/components/EliminationScreen';
import { aliveCount, seatForUser, seatsOf } from '@/features/one-of-us/multi-device-flow';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

interface Props {
    busy: boolean
    /** The win condition fired on this round, so there is no next one to open. */
    gameOver: boolean
    /** Everybody taps; only the first tap opens the round. */
    onContinue: () => void
    /** The board has nothing left to open, so the room shows the result instead. */
    onFinish: () => void
    /** The roster as it stands after the elimination. */
    players: OOUGamePlayer[]
    reveal: OOUReveal
    userId: string
}

// The end of a round: who wrote what, and then who the table sent home.
export default function RoundReveal({
    busy,
    gameOver,
    onContinue,
    onFinish,
    players,
    reveal,
    userId
}: Props) {
    const t = useT();
    const styles = useStyles();

    /** The authored list has been read and the verdict is up. */
    const [verdict, setVerdict] = useState(false);

    const person = seatForUser(players, reveal.votedOut.userId);

    const nameOf = (id: string) => {
        if (id === userId) return t('common.you');

        return players.find(player => player.userId === id)?.name ?? '?';
    };

    // Most-voted first: the list reads as the table's own argument.
    const ordered = [...reveal.answers].sort((left, right) => (
        (right.voters?.length ?? 0) - (left.voters?.length ?? 0)
    ));

    if (verdict && person !== null) {
        return (
            <EliminationScreen
                nextRound={reveal.roundNumber + 1}
                onNext={onContinue}
                person={person}
                remaining={aliveCount(players)}
                role={reveal.votedOut.role}
                seats={seatsOf(players)}
            />
        )
    }

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.intro}>
                <AppText style={styles.kicker}>
                    {t('oneOfUs.multiDevice.play.reveal.round', { round: reveal.roundNumber })}
                </AppText>

                <AppText style={styles.title}>{t('oneOfUs.multiDevice.play.reveal.title')}</AppText>
            </View>

            {ordered.map(answer => (
                <AnswerResult
                    key={answer.slot}
                    answer={answer}
                    nameOf={nameOf}
                />
            ))}

            {reveal.votedOut.tieBrokenByMayor && (
                <AppText style={styles.tie}>
                    {t('oneOfUs.multiDevice.play.reveal.tieBroken')}
                </AppText>
            )}

            <ActionButton
                size='large'
                icon='arrow-right'
                text={busy
                    ? t('common.busy')
                    : gameOver || person === null
                        ? t('oneOfUs.multiDevice.play.reveal.toResult')
                        : t('oneOfUs.multiDevice.play.reveal.next')}
                disabled={busy}
                onPress={() => {
                    if (gameOver) {
                        onFinish();
                        return;
                    }

                    // Nobody to draw a verdict for, so the tap that would have opened it opens the round.
                    if (person === null) {
                        onContinue();
                        return;
                    }

                    setVerdict(true);
                }}
            />
        </ScrollView>
    )
}

interface AnswerResultProps {
    answer: OOUAnswer
    nameOf: (id: string) => string
}

/** One answer, with everything about it now sayable. */
function AnswerResult({ answer, nameOf }: AnswerResultProps) {
    const t = useT();
    const styles = useStyles();

    const voters = answer.voters ?? [];

    return (
        <Card style={styles.answer}>
            <AppText style={styles.text}>{answer.text}</AppText>

            {answer.authorId !== undefined && (
                <AppText style={styles.byline}>
                    {t('oneOfUs.multiDevice.play.reveal.writtenBy', { name: nameOf(answer.authorId) })}
                </AppText>
            )}

            <AppText style={styles.voters}>
                {voters.length === 0
                    ? t('oneOfUs.multiDevice.play.reveal.nobodyPicked')
                    : t('oneOfUs.multiDevice.play.reveal.pickedBy', {
                        names: voters.map(nameOf).join(', ')
                    })}
            </AppText>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    scroll: {
        flex: 1,
        width: '100%'
    },
    content: {
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.five,
        gap: Spacing.three
    },
    intro: {
        gap: 4
    },
    kicker: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },
    title: {
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    answer: {
        gap: 6
    },
    text: {
        fontSize: 16,
        lineHeight: 16 * 1.5,
        fontWeight: 700,
        color: theme.colors.text
    },
    byline: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },
    voters: {
        fontSize: 12,
        lineHeight: 12 * 1.45,
        fontWeight: 600,
        color: theme.colors.textMuted
    },
    tie: {
        fontSize: 12.5,
        lineHeight: 12.5 * 1.45,
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
