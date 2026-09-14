import type { FFGame, FFOption, FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import FilledLine from "@/features/fake-filler/components/play/FilledLine";
import PlayButton from "@/features/fake-filler/components/play/PlayButton";
import { fillPrompt } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { Fragment, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";

interface Props {
    game: FFGame,
    round: FFRound,
    busy: boolean,
    onVote: (roundNumber: number, slot: number) => Promise<boolean>
}

const LETTER_A = 65;

// The voting phase, one round at a time: tap a card, then lock it in at the foot.
export default function VotingScreen({ game, round, busy, onVote }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // The option under the finger, before it is committed.
    const [picked, setPicked] = useState<number | undefined>(undefined);

    const voted = round.myVoteSlot !== undefined;
    const options = [...(round.options ?? [])].sort((left, right) => left.slot - right.slot);
    const chosen = voted ? round.myVoteSlot : picked;

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {!round.canVote && (
                // One of this round's authors, with nothing to do but watch.
                <InlineNotification
                    icon='eye'
                    color={theme.colors.lemon}
                    title={t('fakeFiller.play.voting.yoursTitle')}
                    message={t('fakeFiller.play.voting.yoursMessage')}
                />
            )}

            <View style={styles.options} accessibilityRole='radiogroup'>
                {options.map((option, index) => (
                    <Fragment key={option.slot}>
                        {index > 0 && <Or />}

                        <Option
                            letter={String.fromCharCode(LETTER_A + index)}
                            line={round.line}
                            option={option}
                            active={chosen === option.slot}
                            voted={voted}
                            // Once the vote is in, everything that was not picked steps back.
                            faded={voted && chosen !== option.slot}
                            disabled={busy || voted || !round.canVote}
                            onPress={() => setPicked(option.slot)}
                        />
                    </Fragment>
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

// The "or" between two cards, which is what makes a pair of them read as a duel.
function Or() {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.or} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
            <View style={styles.orRule} />

            <View style={styles.orChip}>
                <AppText style={styles.orText}>{t('fakeFiller.play.voting.or')}</AppText>
            </View>

            <View style={styles.orRule} />
        </View>
    )
}

interface OptionProps {
    letter: string,
    line: string,
    option: FFOption,
    active: boolean,
    voted: boolean,
    faded: boolean,
    disabled: boolean,
    onPress: () => void
}

// One thing to vote for: the prompt as somebody answered it, with their words in a pill.
function Option({ letter, line, option, active, voted, faded, disabled, onPress }: OptionProps) {
    const t = useT();
    const styles = useStyles();

    // A long prompt at the design's size would run off a small phone.
    const { width } = useWindowDimensions();
    const size = width < 380 ? 18 : 21;

    const hint = !active
        ? t('fakeFiller.play.voting.tapToPick')
        : voted ? t('fakeFiller.play.voting.voted') : t('fakeFiller.play.voting.yourPick');

    return (
        <PopPressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='radio'
            accessibilityState={{ checked: active, disabled }}
            accessibilityLabel={`${t('fakeFiller.play.voting.option', { letter })}: ${fillPrompt(line, option.fills)}`}
            style={[styles.option, active && styles.optionActive, faded && styles.faded]}
        >
            <View style={styles.optionHead}>
                <View style={[styles.letter, active && styles.letterActive]}>
                    <AppText style={[styles.letterText, active && styles.letterTextActive]}>{letter}</AppText>
                </View>

                {/* Dropped from the cards that lost once the vote is in, where "tap" would be a lie. */}
                {!faded && <AppText style={[styles.hint, active && styles.hintActive]}>{hint}</AppText>}
            </View>

            <FilledLine
                line={line}
                fills={option.fills}
                size={size}
                leading={1.55}
                pill
                color={active ? Brand.ink : undefined}
            />
        </PopPressable>
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
        paddingTop: 18,
        paddingBottom: Spacing.four,
        gap: Spacing.three
    },
    // Grows into the window, so a short pair of cards splits the screen between them.
    options: {
        flexGrow: 1,
        gap: 9
    },
    option: {
        flexGrow: 1,
        justifyContent: 'center',
        gap: 11,
        padding: 17,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    // A brand surface rather than a themed one, so its outline is ink in both schemes.
    optionActive: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },
    faded: {
        opacity: 0.5
    },
    optionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    letter: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },
    letterActive: {
        borderColor: Brand.ink,
        backgroundColor: Brand.ink
    },
    letterText: {
        fontSize: 14,
        fontWeight: 900,
        color: theme.colors.text
    },
    letterTextActive: {
        color: theme.colors.mint
    },
    hint: {
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },
    hintActive: {
        color: withAlpha(Brand.ink, 0.6)
    },
    or: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    orRule: {
        flex: 1,
        height: 2,
        backgroundColor: withAlpha(theme.colors.text, 0.18)
    },
    // Lemon in both schemes, so its outline and label are ink in both.
    orChip: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },
    orText: {
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: Brand.ink
    },
    foot: {
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
