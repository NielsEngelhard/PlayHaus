import type { OOURound } from '@/api/calls/one-of-us-multi-device';
import AppText from '@/components/text/AppText';
import { Brand, Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { noteInkOf } from '@/features/one-of-us/board-notes';
import PinButton from '@/features/one-of-us/components/PinButton';
import PinnedNote from '@/features/one-of-us/components/PinnedNote';
import { myAnswerSlot } from '@/features/one-of-us/multi-device-flow';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

interface Props {
    busy: boolean
    /** Who settles a tie, so the table knows before it votes rather than after. */
    mayorName: string | null
    myAnswer: string | undefined
    myVoteSlot: number | undefined
    onVote: (roundNumber: number, slot: number) => Promise<boolean>
    round: OOURound
}

// The vote: everybody's briefje, nobody's name.
export default function AnswerVoteScreen({
    busy,
    mayorName,
    myAnswer,
    myVoteSlot,
    onVote,
    round
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // The note under the finger, before it is pinned.
    const [picked, setPicked] = useState<number | undefined>(undefined);

    const voted = myVoteSlot !== undefined;
    const answers = round.answers ?? [];
    const mine = myAnswerSlot(answers, myAnswer);

    const marked = voted ? myVoteSlot : picked;

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <AppText style={styles.title}>{t('oneOfUs.multiDevice.play.vote.title')}</AppText>

            <View style={styles.notes}>
                {answers.map((answer, index) => {
                    const own = answer.slot === mine;
                    const active = answer.slot === marked;
                    const tone = own ? 'mine' : active ? 'picked' : 'paper';
                    const ink = noteInkOf(tone, theme);

                    return (
                        <PinnedNote
                            key={answer.slot}
                            index={index}
                            tone={tone}
                            style={styles.note}
                            disabled={busy || voted || own}
                            accessibilityLabel={answer.text}
                            // The server refuses a self-vote, so a briefje the board knows is yours is not offered.
                            onPress={own ? undefined : () => setPicked(answer.slot)}
                        >
                            <AppText style={[styles.noteText, { color: ink.text }]}>
                                {answer.text}
                            </AppText>

                            {own && (
                                <View style={styles.badge}>
                                    <AppText style={styles.badgeText}>
                                        {t('oneOfUs.multiDevice.play.vote.mine')}
                                    </AppText>
                                </View>
                            )}

                            {active && (
                                <View style={styles.check}>
                                    <Feather name='check' size={14} color={Brand.ink} />
                                </View>
                            )}
                        </PinnedNote>
                    )
                })}
            </View>

            <View style={styles.bottom}>
                {mayorName !== null && (
                    <AppText style={styles.tie}>
                        {t('oneOfUs.multiDevice.play.vote.tie')}

                        <AppText style={styles.tieName}>{` ${mayorName} `}</AppText>

                        {t('oneOfUs.multiDevice.play.vote.tieTail')}
                    </AppText>
                )}

                {voted ? (
                    <AppText style={styles.waiting}>
                        {t('oneOfUs.multiDevice.play.vote.waiting')}
                    </AppText>
                ) : (
                    <PinButton
                        text={busy
                            ? t('common.busy')
                            : t('oneOfUs.multiDevice.play.vote.confirm')}
                        disabled={busy || picked === undefined}
                        onPress={() => {
                            if (picked !== undefined) void onVote(round.number, picked);
                        }}
                    />
                )}
            </View>
        </ScrollView>
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
        gap: Spacing.three
    },

    title: {
        fontSize: 21,
        fontWeight: 900,
        letterSpacing: -0.8,
        lineHeight: 21 * 1.1,
        color: theme.colors.text
    },

    notes: {
        gap: 11
    },

    note: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 13
    },

    noteText: {
        flex: 1,
        minWidth: 0,
        fontSize: 15.5,
        lineHeight: 15.5 * 1.4,
        fontWeight: 700
    },

    // Paper in the circle so the tick is ink on it, whichever fill the note is wearing.
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

    badge: {
        flexShrink: 0,
        paddingVertical: 2,
        paddingHorizontal: 7,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    badgeText: {
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: 0.4,
        color: Brand.ink
    },

    bottom: {
        marginTop: 'auto',
        gap: Spacing.two
    },

    tie: {
        fontSize: 11,
        lineHeight: 11 * 1.45,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    tieName: {
        fontWeight: 900,
        color: theme.colors.text
    },

    waiting: {
        textAlign: 'center',
        fontSize: 12.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
