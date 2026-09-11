import type { FFGame, FFOption, FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import FilledLine from "@/features/fake-filler/components/play/FilledLine";
import PlayButton from "@/features/fake-filler/components/play/PlayButton";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { fillPrompt } from "@/features/fake-filler/prompt";
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
    const chosen = voted ? round.myVoteSlot : picked;

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.head}>
                <AppText style={styles.kicker}>
                    {t('fakeFiller.play.voting.roundOf', {
                        round: round.number,
                        total: game.totalRounds
                    })}
                </AppText>

                <AppText style={styles.question} numberOfLines={2}>
                    {/* Creative mode has no truth to find, so asking which one is real would be asking a question with no answer. */}
                    {game.gameMode === 'facts'
                        ? t('fakeFiller.play.voting.title')
                        : t('fakeFiller.play.voting.titleCreative')}
                </AppText>
            </View>

            {/* The prompt as it was dealt, so the line-up below it reads as answers to one question. */}
            <FilledLine line={round.line} fills={null} size={17} color={theme.colors.textSecondary} />

            {!round.canVote && (
                // One of this round's authors, with nothing to do but watch.
                <InlineNotification
                    icon='eye'
                    color={theme.colors.lemon}
                    title={t('fakeFiller.play.voting.yoursTitle')}
                    message={t('fakeFiller.play.voting.yoursMessage')}
                />
            )}

            <View style={styles.options}>
                {options.map(option => (
                    <Option
                        key={option.slot}
                        line={round.line}
                        option={option}
                        active={chosen === option.slot}
                        // Said on the card rather than under the list, where it would read as a fourth option.
                        note={voted && chosen === option.slot ? t('fakeFiller.play.voting.voted') : undefined}
                        // Once the vote is in, everything that was not picked steps back.
                        faded={voted && chosen !== option.slot}
                        disabled={busy || voted || !round.canVote}
                        onPress={() => setPicked(option.slot)}
                    />
                ))}
            </View>

            <View style={styles.foot}>
                <AppText style={styles.progress}>
                    {t('fakeFiller.play.voting.progress', {
                        done: round.voteCount,
                        total: game.votesNeeded
                    })}
                </AppText>

                {round.canVote && (voted ? (
                    <AppText style={styles.waiting}>
                        {t('fakeFiller.play.voting.waiting')}
                    </AppText>
                ) : (
                    <PlayButton
                        tone='ink'
                        text={busy ? t('common.busy') : t('fakeFiller.play.voting.confirm')}
                        disabled={busy || picked === undefined}
                        onPress={() => {
                            if (picked !== undefined) void onVote(round.number, picked);
                        }}
                    />
                ))}
            </View>
        </ScrollView>
    )
}

interface OptionProps {
    line: string,
    option: FFOption,
    active: boolean,
    /** A word on the card itself, once there is something to say about it. */
    note?: string,
    faded: boolean,
    disabled: boolean,
    onPress: () => void
}

/** One thing to vote for: the prompt as somebody answered it, with their words marked. */
function Option({ line, option, active, note, faded, disabled, onPress }: OptionProps) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <PopPressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='radio'
            accessibilityState={{ checked: active, disabled }}
            accessibilityLabel={fillPrompt(line, option.fills)}
            style={[styles.option, active && styles.optionActive, faded && styles.faded]}
        >
            <FilledLine
                line={line}
                fills={option.fills}
                // The marker pen changes colour on the mint, where lemon would disappear.
                mark={active ? MARK_ON_MINT : theme.colors.lemon}
                color={active ? Brand.ink : undefined}
            />

            {note !== undefined && <AppText style={styles.picked}>{note}</AppText>}
        </PopPressable>
    )
}

/** Paper at three quarters: the one mark that still reads once the card underneath went mint. */
const MARK_ON_MINT = withAlpha(Brand.textOnAccent, 0.75);

const useStyles = createThemedStyles(theme => ({
    scroll: {
        flex: 1,
        width: '100%'
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.four,
        gap: Spacing.three
    },
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    kicker: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },
    // The question, said once at the top rather than as a heading over every option.
    question: {
        flexShrink: 1,
        textAlign: 'right',
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.text
    },
    options: {
        gap: Spacing.two + 1
    },
    option: {
        gap: Spacing.one,
        paddingVertical: 12,
        paddingHorizontal: 13,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },
    // The one card being voted for stands a step proud of the two beside it.
    optionActive: {
        borderWidth: 3,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hard
    },
    faded: {
        opacity: 0.5
    },
    picked: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: withAlpha(Brand.ink, 0.55)
    },
    foot: {
        marginTop: 'auto',
        paddingTop: Spacing.three,
        gap: Spacing.two + 1
    },
    // Tabular, so the left-hand digit does not twitch as votes land.
    progress: {
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 800,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    },
    waiting: {
        textAlign: 'center',
        fontSize: 12.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
