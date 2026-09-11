import type { OOUAnswer, OOUGamePlayer, OOUReveal } from '@/api/calls/one-of-us-multi-device';
import AppText from '@/components/text/AppText';
import SeatAvatar from '@/components/ui/SeatAvatar';
import { Brand, Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { noteInkOf, type NoteTone } from '@/features/one-of-us/board-notes';
import PinButton from '@/features/one-of-us/components/PinButton';
import PinnedNote from '@/features/one-of-us/components/PinnedNote';
import RoleVerdict from '@/features/one-of-us/components/RoleVerdict';
import { seatForUser } from '@/features/one-of-us/multi-device-flow';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import type { Seat } from '@/features/table/seats';
import Feather from '@expo/vector-icons/Feather';
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

// The end of a round: the briefjes turned over, and who the table sent home on the back of them.
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

    const person = seatForUser(players, reveal.votedOut.userId);

    const nameOf = (id: string) => {
        if (id === userId) return t('common.you');

        return players.find(player => player.userId === id)?.name ?? '?';
    };

    // Most-voted first: the board reads as the table's own argument.
    const ordered = [...reveal.answers].sort((left, right) => (
        (right.voters?.length ?? 0) - (left.voters?.length ?? 0)
    ));

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <AppText style={styles.title}>{t('oneOfUs.multiDevice.play.reveal.title')}</AppText>

            {ordered.map((answer, index) => (
                <TurnedNote
                    key={answer.slot}
                    answer={answer}
                    author={answer.authorId === undefined
                        ? null
                        : seatForUser(players, answer.authorId)}
                    index={index}
                    name={answer.authorId === undefined ? null : nameOf(answer.authorId)}
                    out={answer.authorId !== undefined && answer.authorId === reveal.votedOut.userId}
                />
            ))}

            {person !== null && (
                <RoleVerdict name={person.name} role={reveal.votedOut.role} />
            )}

            {reveal.votedOut.tieBrokenByMayor && (
                <AppText style={styles.tie}>
                    {t('oneOfUs.multiDevice.play.reveal.tieBroken')}
                </AppText>
            )}

            <PinButton
                style={styles.next}
                icon="arrow-right"
                text={busy
                    ? t('common.busy')
                    : gameOver
                        ? t('oneOfUs.multiDevice.play.reveal.toResult')
                        : t('oneOfUs.multiDevice.play.reveal.next', { round: reveal.roundNumber + 1 })}
                disabled={busy}
                onPress={gameOver ? onFinish : onContinue}
            />
        </ScrollView>
    )
}

interface TurnedNoteProps {
    answer: OOUAnswer
    /** Who wrote it, now that is sayable. */
    author: Seat | null
    index: number
    name: string | null
    /** This is the briefje the table pinned. */
    out: boolean
}

/** One briefje, turned over: what it said, who wrote it, and how many went for it. */
function TurnedNote({ answer, author, index, name, out }: TurnedNoteProps) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const tone: NoteTone = out ? 'out' : 'paper';
    const ink = noteInkOf(tone, theme);
    const votes = answer.voters?.length ?? 0;

    return (
        <PinnedNote index={index} tone={tone} style={styles.note}>
            <View style={styles.noteHead}>
                <AppText style={[styles.noteText, { color: ink.text }]}>{answer.text}</AppText>

                {out && (
                    <View style={styles.check}>
                        <Feather name="check" size={14} color={Brand.ink} />
                    </View>
                )}
            </View>

            {name !== null && (
                <View style={[styles.byline, { borderTopColor: ink.muted }]}>
                    {author !== null && <SeatAvatar seat={author} size={22} />}

                    <AppText style={[styles.name, { color: ink.text }]} numberOfLines={1}>
                        {out ? t('oneOfUs.multiDevice.play.reveal.votedOut', { name }) : name}
                    </AppText>

                    <AppText style={[styles.votes, { color: votes === 0 ? ink.muted : ink.text }]}>
                        {votes}
                    </AppText>
                </View>
            )}
        </PinnedNote>
    )
}

const useStyles = createThemedStyles(theme => ({
    scroll: {
        flex: 1,
        width: '100%'
    },

    content: {
        flexGrow: 1,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.five,
        gap: 10
    },

    title: {
        marginBottom: 6,
        fontSize: 21,
        fontWeight: 900,
        letterSpacing: -0.8,
        lineHeight: 21 * 1.1,
        color: theme.colors.text
    },

    note: {
        gap: 7,
        paddingVertical: 12,
        paddingHorizontal: 13
    },

    noteHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    noteText: {
        flex: 1,
        minWidth: 0,
        fontSize: 15.5,
        lineHeight: 15.5 * 1.4,
        fontWeight: 700
    },

    check: {
        width: 24,
        height: 24,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    // Torn off the note above it rather than ruled: the author was not part of what was pinned.
    byline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingTop: 6,
        borderTopWidth: 1.5,
        borderStyle: 'dashed'
    },

    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 11.5,
        fontWeight: 900
    },

    votes: {
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 900,
        fontVariant: ['tabular-nums']
    },

    tie: {
        fontSize: 11.5,
        lineHeight: 11.5 * 1.45,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    next: {
        marginTop: 'auto'
    }
}))
