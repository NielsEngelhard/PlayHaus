import type { FFGame, FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import InlineNotification from "@/components/ui/InlineNotification";
import PickRow from "@/components/ui/PickRow";
import TextButton from "@/components/ui/TextButton";
import { Spacing } from "@/constants/theme";
import PromptLine from "@/features/fake-filler/components/play/PromptLine";
import { fillPrompt } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { ScrollView, View } from "react-native";

interface Props {
    game: FFGame,
    round: FFRound,
    busy: boolean,
    onVote: (roundNumber: number, slot: number) => Promise<boolean>
}

// The voting phase, one round at a time.
export default function VotingScreen({ game, round, busy, onVote }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // The option under the finger, before it is committed.
    const [picked, setPicked] = useState<number | undefined>(undefined);

    const voted = round.myVoteSlot !== undefined;
    const options = round.options ?? [];

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.intro}>
                <AppText style={styles.kicker}>
                    {t('fakeFiller.play.voting.roundOf', {
                        round: round.number,
                        total: game.totalRounds
                    })}
                </AppText>

                <AppText style={styles.title}>
                    {/* Creative mode has no truth to find, so asking which one is real would be asking a question with no answer. */}
                    {game.gameMode === 'facts'
                        ? t('fakeFiller.play.voting.title')
                        : t('fakeFiller.play.voting.titleCreative')}
                </AppText>
            </View>

            <Card style={styles.prompt}>
                <PromptLine line={round.line} fills={null} />
            </Card>

            {round.canVote ? (
                <View style={styles.options}>
                    {options.map(option => (
                        <PickRow
                            key={option.slot}
                            mode='radio'
                            // A whole filled-in sentence, so it is allowed to wrap: cut after one line it would be a thing to vote on unread.
                            lines={4}
                            label={fillPrompt(round.line, option.fills)}
                            active={voted ? round.myVoteSlot === option.slot : picked === option.slot}
                            disabled={busy || voted}
                            onPress={() => setPicked(option.slot)}
                        />
                    ))}

                    {voted ? (
                        <AppText style={styles.waiting}>
                            {t('fakeFiller.play.voting.waiting')}
                        </AppText>
                    ) : (
                        <TextButton
                            text={busy ? t('common.busy') : t('fakeFiller.play.voting.confirm')}
                            variant='primary'
                            fullWidth
                            disabled={busy || picked === undefined}
                            onPress={() => {
                                if (picked !== undefined) void onVote(round.number, picked);
                            }}
                        />
                    )}
                </View>
            ) : (
                // One of this round's two authors, with nothing to do but watch.
                <View style={styles.options}>
                    <InlineNotification
                        icon='eye'
                        color={theme.colors.lemon}
                        title={t('fakeFiller.play.voting.yoursTitle')}
                        message={t('fakeFiller.play.voting.yoursMessage')}
                    />

                    {options.map(option => (
                        <PickRow
                            key={option.slot}
                            mode='radio'
                            lines={4}
                            label={fillPrompt(round.line, option.fills)}
                            active={false}
                            disabled
                            onPress={() => { }}
                        />
                    ))}
                </View>
            )}

            <AppText style={styles.progress}>
                {t('fakeFiller.play.voting.progress', {
                    done: round.voteCount,
                    total: game.votesNeeded
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
    prompt: {
        gap: Spacing.two
    },
    options: {
        gap: Spacing.two
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
