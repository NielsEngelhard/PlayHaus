import type { OOURound } from '@/api/calls/one-of-us-multi-device';
import AppText from '@/components/text/AppText';
import PickRow from '@/components/ui/PickRow';
import ValidateButton from '@/components/ui/ValidateButton';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

interface Props {
    busy: boolean
    /** Who settles a tie, so the table knows before it votes rather than after. */
    mayorName: string | null
    myVoteSlot: number | undefined
    onVote: (roundNumber: number, slot: number) => Promise<boolean>
    round: OOURound
}

// The vote: everybody's answer, nobody's name.
export default function AnswerVoteScreen({
    busy,
    mayorName,
    myVoteSlot,
    onVote,
    round
}: Props) {
    const t = useT();
    const styles = useStyles();

    // The option under the finger, before it is committed.
    const [picked, setPicked] = useState<number | undefined>(undefined);

    const voted = myVoteSlot !== undefined;
    const answers = round.answers ?? [];

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.intro}>
                <AppText style={styles.kicker}>
                    {t('oneOfUs.multiDevice.play.vote.round', { round: round.number })}
                </AppText>

                <AppText style={styles.title}>{t('oneOfUs.multiDevice.play.vote.title')}</AppText>

                <AppText style={styles.lede}>{t('oneOfUs.multiDevice.play.vote.intro')}</AppText>
            </View>

            <View style={styles.options}>
                {answers.map(answer => (
                    <PickRow
                        key={answer.slot}
                        mode='radio'
                        // A whole typed clue, so it is allowed to wrap: cut to one line it would be a thing voted on unread.
                        lines={4}
                        label={answer.text}
                        active={voted ? myVoteSlot === answer.slot : picked === answer.slot}
                        // Every slot is pickable, your own included: two identical answers must stay two options.
                        disabled={busy || voted}
                        onPress={() => setPicked(answer.slot)}
                    />
                ))}
            </View>

            {mayorName !== null && (
                <View style={styles.mayor}>
                    <AppText style={styles.kicker}>{t('oneOfUs.play.vote.mayorLabel')}</AppText>

                    <AppText style={styles.mayorNote}>
                        {t('oneOfUs.play.vote.mayorNote', { name: mayorName })}
                    </AppText>
                </View>
            )}

            {voted ? (
                <AppText style={styles.waiting}>
                    {t('oneOfUs.multiDevice.play.vote.waiting')}
                </AppText>
            ) : (
                <ValidateButton
                    label={busy
                        ? t('common.busy')
                        : t('oneOfUs.multiDevice.play.vote.confirm')}
                    hint={picked === undefined
                        ? t('oneOfUs.multiDevice.play.vote.locked')
                        : t('oneOfUs.multiDevice.play.vote.confirmHint')}
                    unlocked={!busy && picked !== undefined}
                    onPress={() => {
                        if (picked !== undefined) void onVote(round.number, picked);
                    }}
                />
            )}

            <AppText style={styles.progress}>
                {t('oneOfUs.multiDevice.play.vote.progress', {
                    done: round.votesIn,
                    total: round.votesNeeded
                })}
            </AppText>
        </ScrollView>
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
    lede: {
        fontSize: 13.5,
        lineHeight: 13.5 * 1.5,
        fontWeight: 600,
        color: theme.colors.textSecondary
    },
    options: {
        gap: Spacing.two
    },
    mayor: {
        gap: 3
    },
    mayorNote: {
        fontSize: 12,
        lineHeight: 12 * 1.45,
        fontWeight: 600,
        color: theme.colors.textMuted
    },
    waiting: {
        textAlign: 'center',
        fontSize: 12.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    progress: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 800,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    }
}))
