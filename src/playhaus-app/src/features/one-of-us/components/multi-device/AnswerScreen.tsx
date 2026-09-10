import type { OOURound } from '@/api/calls/one-of-us-multi-device';
import AppText from '@/components/text/AppText';
import AnswerReveal from '@/components/ui/AnswerReveal';
import Card from '@/components/ui/Card';
import InlineNotification from '@/components/ui/InlineNotification';
import TextButton from '@/components/ui/TextButton';
import TextField from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

interface Props {
    busy: boolean
    /** This player's answer for the round, once it is in. */
    myAnswer: string | undefined
    onSubmit: (roundNumber: number, text: string) => Promise<boolean>
    /** This player's own line, and empty for the nitwit. */
    prompt: string
    round: OOURound
}

/** The server's own cap, so a too-long answer is caught before it is sent. */
const MAX_LENGTH = 140;

// The answer phase: one clue about your own prompt, typed on your own phone.
export default function AnswerScreen({ busy, myAnswer, onSubmit, prompt, round }: Props) {
    const t = useT();
    const styles = useStyles();

    const [text, setText] = useState('');
    const answered = myAnswer !== undefined;

    async function submit() {
        const trimmed = text.trim();
        if (trimmed === '') return;

        await onSubmit(round.number, trimmed);
    }

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            // The keyboard is up for most of this screen.
            keyboardShouldPersistTaps='handled'
        >
            <View style={styles.intro}>
                <AppText style={styles.kicker}>
                    {t('oneOfUs.multiDevice.play.answer.round', { round: round.number })}
                </AppText>

                <AppText style={styles.title}>{t('oneOfUs.multiDevice.play.answer.title')}</AppText>

                <AppText style={styles.lede}>{t('oneOfUs.multiDevice.play.answer.intro')}</AppText>
            </View>

            {/* Covered by default: everybody is sitting in the same room. */}
            <AnswerReveal
                compact
                answer={prompt === '' ? t('oneOfUs.play.reveal.noWord') : prompt}
            />

            {answered ? (
                <View style={styles.options}>
                    <WaitingOnTable />

                    <Card style={styles.locked}>
                        <AppText style={styles.lockedLabel}>
                            {t('oneOfUs.multiDevice.play.answer.yours')}
                        </AppText>

                        <AppText style={styles.lockedText}>{myAnswer}</AppText>
                    </Card>
                </View>
            ) : (
                <View style={styles.options}>
                    <TextField
                        label={t('oneOfUs.multiDevice.play.answer.field')}
                        value={text}
                        onChangeText={value => setText(value.slice(0, MAX_LENGTH))}
                        placeholder={t('oneOfUs.multiDevice.play.answer.placeholder')}
                        autoCapitalize='sentences'
                        returnKeyType='done'
                        editable={!busy}
                        onSubmitEditing={() => void submit()}
                    />

                    <TextButton
                        text={busy ? t('common.busy') : t('oneOfUs.multiDevice.play.answer.submit')}
                        variant='primary'
                        fullWidth
                        disabled={busy || text.trim() === ''}
                        onPress={() => void submit()}
                    />
                </View>
            )}

            <AppText style={styles.progress}>
                {t('oneOfUs.multiDevice.play.answer.progress', {
                    done: round.answersIn,
                    total: round.answersNeeded
                })}
            </AppText>
        </ScrollView>
    )
}

// Yours is in and the round is waiting on somebody else.
function WaitingOnTable() {
    const t = useT();
    const theme = useTheme();

    return (
        <InlineNotification
            icon='clock'
            color={theme.colors.lemon}
            title={t('oneOfUs.multiDevice.play.answer.waitingTitle')}
            message={t('oneOfUs.multiDevice.play.answer.waitingMessage')}
        />
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
    locked: {
        gap: 4
    },
    lockedLabel: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },
    lockedText: {
        fontSize: 16,
        lineHeight: 16 * 1.45,
        fontWeight: 700,
        color: theme.colors.text
    },
    // Tabular, so the left-hand digit does not twitch as answers land.
    progress: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 800,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    }
}))
