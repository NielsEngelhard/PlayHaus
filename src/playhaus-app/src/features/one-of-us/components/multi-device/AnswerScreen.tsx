import type { OOURound } from '@/api/calls/one-of-us-multi-device';
import AppText from '@/components/text/AppText';
import { fontFamilyForWeight, Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import PinButton from '@/features/one-of-us/components/PinButton';
import PinnedNote, { NotePin } from '@/features/one-of-us/components/PinnedNote';
import PinnedTrack from '@/features/one-of-us/components/PinnedTrack';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

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

// The answer phase: one clue about your own briefje, written on a briefje of its own.
export default function AnswerScreen({ busy, myAnswer, onSubmit, prompt, round }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [text, setText] = useState('');
    const answered = myAnswer !== undefined;

    async function submit() {
        const trimmed = text.trim();
        if (trimmed === '') return;

        await onSubmit(round.number, trimmed);
    }

    const about = prompt === ''
        ? t('oneOfUs.multiDevice.play.answer.aboutBlank')
        : t('oneOfUs.multiDevice.play.answer.about', { prompt });

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            // The keyboard is up for most of this screen.
            keyboardShouldPersistTaps='handled'
        >
            <AppText style={styles.title}>{t('oneOfUs.multiDevice.play.answer.title')}</AppText>

            <PinnedNote style={styles.note}>
                <View style={styles.head}>
                    <AppText style={styles.about} numberOfLines={2}>{about}</AppText>

                    <NotePin size={12} />
                </View>

                {answered ? (
                    <View style={styles.written}>
                        <AppText style={styles.writtenText}>{myAnswer}</AppText>
                    </View>
                ) : (
                    <TextInput
                        value={text}
                        onChangeText={value => setText(value.slice(0, MAX_LENGTH))}
                        placeholder={t('oneOfUs.multiDevice.play.answer.placeholder')}
                        placeholderTextColor={theme.colors.textMuted}
                        accessibilityLabel={t('oneOfUs.multiDevice.play.answer.field')}
                        autoCapitalize='sentences'
                        autoCorrect={false}
                        editable={!busy}
                        multiline
                        returnKeyType='done'
                        onSubmitEditing={() => void submit()}
                        style={styles.input}
                    />
                )}

                <AppText style={styles.counter}>
                    {answered
                        ? t('oneOfUs.multiDevice.play.answer.hung')
                        : t('oneOfUs.multiDevice.play.answer.counter', {
                            typed: text.length,
                            max: MAX_LENGTH
                        })}
                </AppText>
            </PinnedNote>

            {answered ? (
                <AppText style={styles.waiting}>
                    {t('oneOfUs.multiDevice.play.answer.waitingMessage')}
                </AppText>
            ) : (
                <PinButton
                    text={busy ? t('common.busy') : t('oneOfUs.multiDevice.play.answer.submit')}
                    disabled={busy || text.trim() === ''}
                    onPress={() => void submit()}
                />
            )}

            {/* Pinned to the bottom of the board, whatever the note above it grew to. */}
            <View style={styles.bottom}>
                <PinnedTrack
                    done={round.answersIn}
                    label={t('oneOfUs.multiDevice.play.answer.pinned')}
                    total={round.answersNeeded}
                />
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

    note: {
        gap: 10,
        padding: 14
    },

    head: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
    },

    about: {
        flex: 1,
        minWidth: 0,
        fontSize: 9.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },

    // The ruled line you write on, which is the note's own rule rather than a field's border.
    input: {
        minHeight: 70,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.borderMuted,
        fontSize: 16,
        lineHeight: 16 * 1.5,
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(700),
        textAlignVertical: 'top',
        color: theme.colors.text
    },

    written: {
        minHeight: 70,
        justifyContent: 'center',
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.borderMuted
    },

    writtenText: {
        fontSize: 16,
        lineHeight: 16 * 1.5,
        fontWeight: 700,
        color: theme.colors.text
    },

    // Tabular, so the count does not twitch as it is typed into.
    counter: {
        fontSize: 10.5,
        fontWeight: 800,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    },

    bottom: {
        marginTop: 'auto'
    },

    waiting: {
        textAlign: 'center',
        fontSize: 12.5,
        lineHeight: 12.5 * 1.45,
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
