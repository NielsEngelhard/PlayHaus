import { TRUTH_AUTHOR_ID, type FFGame, type FFOption, type FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import InlineNotification from "@/components/ui/InlineNotification";
import PlayerScoreRow from "@/components/ui/PlayerScoreRow";
import PopPressable from "@/components/ui/PopPressable";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import FilledLine from "@/features/fake-filler/components/play/FilledLine";
import PlayButton from "@/features/fake-filler/components/play/PlayButton";
import VoterBubbles from "@/features/fake-filler/components/play/VoterBubbles";
import { fillPrompt } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Fragment, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";

interface Props {
    game: FFGame,
    round: FFRound,
    userId: string,
    busy: boolean,
    onVote: (roundNumber: number, slot: number) => Promise<boolean>,
    // Whether there is another round behind this one, which changes what the button says.
    more: boolean,
    // Only the host leaves the reveal, and only their tap moves the table.
    isHost: boolean,
    advancing: boolean,
    onContinue: () => void
}

const LETTER_A = 65;

// One round from vote to verdict: tap a card and lock it in, then the same cards turn over to show who wrote what.
export default function VotingScreen({ game, round, userId, busy, onVote, more, isHost, advancing, onContinue }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // The option under the finger, before it is committed.
    const [picked, setPicked] = useState<number | undefined>(undefined);

    const revealed = round.revealed;
    const voted = round.myVoteSlot !== undefined;
    // Slot order in both phases, so no card moves when the round is told.
    const options = [...(round.options ?? [])].sort((left, right) => left.slot - right.slot);
    const chosen = voted ? round.myVoteSlot : picked;

    const nameOf = (id: string) => {
        if (id === userId) return t('common.you');

        return game.players.find(player => player.userId === id)?.name ?? '?';
    };

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {!revealed && !round.canVote && (
                // One of this round's authors, with nothing to do but watch.
                <InlineNotification
                    icon='eye'
                    color={theme.colors.lemon}
                    title={t('fakeFiller.play.voting.yoursTitle')}
                    message={t('fakeFiller.play.voting.yoursMessage')}
                />
            )}

            <View style={styles.options} accessibilityRole={revealed ? undefined : 'radiogroup'}>
                {options.map((option, index) => {
                    const letter = String.fromCharCode(LETTER_A + index);

                    return (
                        <Fragment key={option.slot}>
                            {index > 0 && <Or />}

                            {revealed ? (
                                <RevealedOption
                                    letter={letter}
                                    line={round.line}
                                    option={option}
                                    game={game}
                                    userId={userId}
                                    mine={round.myVoteSlot === option.slot}
                                    nameOf={nameOf}
                                />
                            ) : (
                                <Option
                                    letter={letter}
                                    line={round.line}
                                    option={option}
                                    active={chosen === option.slot}
                                    voted={voted}
                                    // Once the vote is in, everything that was not picked steps back.
                                    faded={voted && chosen !== option.slot}
                                    disabled={busy || voted || !round.canVote}
                                    onPress={() => setPicked(option.slot)}
                                />
                            )}
                        </Fragment>
                    );
                })}
            </View>

            {revealed ? (
                <View style={styles.foot}>
                    <PlayerScoreRow players={game.players} userId={userId} />

                    {isHost ? (
                        <PlayButton
                            text={more
                                ? t('fakeFiller.play.reveal.next')
                                : t('fakeFiller.play.reveal.toResults')}
                            icon='arrow-right'
                            disabled={advancing}
                            onPress={onContinue}
                        />
                    ) : (
                        <Card style={styles.hostWait}>
                            <AppText style={styles.hostWaitText}>
                                {more
                                    ? t('fakeFiller.play.reveal.waitingForHost')
                                    : t('fakeFiller.play.reveal.waitingForResults')}
                            </AppText>
                        </Card>
                    )}
                </View>
            ) : (
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
            )}
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

// A long prompt at the design's size would run off a small phone.
function useLineSize() {
    const { width } = useWindowDimensions();

    return width < 380 ? 18 : 21;
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
    const size = useLineSize();

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

interface RevealedOptionProps {
    letter: string,
    line: string,
    option: FFOption,
    game: FFGame,
    userId: string,
    mine: boolean,
    nameOf: (id: string) => string
}

// The same card once the round is told: truth or fake, who wrote it, what it earned, and who fell for it.
function RevealedOption({ letter, line, option, game, userId, mine, nameOf }: RevealedOptionProps) {
    const t = useT();
    const styles = useStyles();
    const size = useLineSize();

    const facts = game.gameMode === 'facts';
    const truth = option.isTruth === true;
    const correctMine = truth && mine;
    const wrongMine = !truth && mine;
    const voters = option.voters ?? [];

    // A fake always has an author; the guard is for a round that arrives without one.
    const authorIds = option.authorIds ?? (option.authorId === undefined ? [] : [option.authorId]);
    const authors = truth ? [] : authorIds.filter(id => id !== TRUTH_AUTHOR_ID).map(nameOf);
    const shared = authors.length > 1;

    // Only a fake pays its author; the truth pays each of the people who spotted it.
    const points = truth
        ? (facts && voters.length > 0 ? t('fakeFiller.play.reveal.pointsEach') : null)
        : voters.length === 0
            ? '0'
            : t(shared ? 'fakeFiller.play.reveal.pointsShared' : 'fakeFiller.play.reveal.points', { points: voters.length });

    const verdict = truth
        ? t('fakeFiller.play.reveal.truth')
        : [facts ? t('fakeFiller.play.reveal.fake') : null, ...authors, shared ? t('fakeFiller.play.reveal.greatMinds') : null]
            .filter(part => part !== null)
            .join(', ');

    return (
        <View
            accessible
            accessibilityLabel={`${t('fakeFiller.play.voting.option', { letter })}: ${fillPrompt(line, option.fills)}. ${verdict}`}
            style={[
                styles.option,
                truth && styles.optionActive,
                correctMine && styles.optionCorrectMine,
                wrongMine && styles.optionWrongMine
            ]}
        >
            <View style={styles.optionHead}>
                <View style={[styles.letter, truth && styles.letterActive]}>
                    <AppText style={[styles.letterText, truth && styles.letterTextActive]}>{letter}</AppText>
                </View>

                {truth ? (
                    <View style={styles.truthTag}>
                        <AppText style={styles.truthTagText}>{t('fakeFiller.play.reveal.truth')}</AppText>
                    </View>
                ) : facts && (
                    <AppText style={styles.hint}>{t('fakeFiller.play.reveal.fake')}</AppText>
                )}

                {authors.map((name, index) => <AuthorTag key={`${index}-${name}`} name={name} />)}

                {shared && (
                    <AppText style={styles.hint}>{t('fakeFiller.play.reveal.greatMinds')}</AppText>
                )}

                {mine && (
                    <AppText style={[styles.hint, truth && styles.hintActive]}>
                        {t('fakeFiller.play.voting.yourPick')}
                    </AppText>
                )}

                {points !== null && (
                    <AppText style={[
                        styles.points,
                        truth && styles.pointsOnBrand,
                        voters.length === 0 && styles.pointsNone
                    ]}>
                        {points}
                    </AppText>
                )}
            </View>

            <FilledLine
                line={line}
                fills={option.fills}
                size={size}
                leading={1.55}
                pill
                color={truth ? Brand.ink : undefined}
            />

            {voters.length === 0 ? (
                <AppText style={[styles.nobody, truth && styles.nobodyOnBrand]}>
                    {t('fakeFiller.play.reveal.nobodyPicked')}
                </AppText>
            ) : (
                <VoterBubbles voters={voters} players={game.players} userId={userId} onBrand={truth} />
            )}
        </View>
    )
}

// Who wrote it, kept legible: the game's mint only outlines the pill, never the name.
function AuthorTag({ name }: { name: string }) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.authorTag}>
            <Feather name='user' size={11} color={theme.colors.text} />

            <AppText style={styles.authorName} numberOfLines={1}>{name}</AppText>
        </View>
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
    // The truth, when it was also your pick — one shade past optionActive's mint.
    optionCorrectMine: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.available
    },
    // The one you picked, once the truth turned out to be a different card.
    optionWrongMine: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.blush
    },
    faded: {
        opacity: 0.5
    },
    optionHead: {
        flexDirection: 'row',
        flexWrap: 'wrap',
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
    truthTag: {
        paddingVertical: 3,
        paddingHorizontal: 9,
        borderRadius: 999,
        backgroundColor: Brand.ink
    },
    truthTagText: {
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        color: theme.colors.mint
    },
    authorTag: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: Brand.mint,
        backgroundColor: theme.colors.backgroundElement,
        paddingHorizontal: 8,
        paddingVertical: 3
    },
    authorName: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        color: theme.colors.text
    },
    // Pushed to the far end of the head, wherever the row wraps.
    points: {
        marginLeft: 'auto',
        fontSize: 13,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    },
    pointsOnBrand: {
        color: Brand.ink
    },
    // Nothing earned, so the number is there to be read past rather than read.
    pointsNone: {
        color: theme.colors.textMuted
    },
    nobody: {
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },
    nobodyOnBrand: {
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
    },
    hostWait: {
        alignItems: 'center'
    },
    hostWaitText: {
        fontSize: 13,
        lineHeight: 13 * 1.45,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
