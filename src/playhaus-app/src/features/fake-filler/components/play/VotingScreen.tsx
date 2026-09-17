import { TRUTH_AUTHOR_ID, type FFGame, type FFOption, type FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import InlineNotification from "@/components/ui/InlineNotification";
import PlayerScoreRow from "@/components/ui/PlayerScoreRow";
import PopPressable from "@/components/ui/PopPressable";
import { Brand, Radii, Spacing, withAlpha } from "@/constants/theme";
import FilledLine from "@/features/fake-filler/components/play/FilledLine";
import PlayButton from "@/features/fake-filler/components/play/PlayButton";
import RoundVerdict, { type Verdict } from "@/features/fake-filler/components/play/RoundVerdict";
import VoterBubbles from "@/features/fake-filler/components/play/VoterBubbles";
import { fillPrompt } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { joinNames } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { Fragment, useState } from "react";
import { Platform, ScrollView, useWindowDimensions, View } from "react-native";

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

// How wide a stamped name may get before it is cut.
const STAMP_MAX_WIDTH = 170;

// What spotting the real answer pays, kept in step with the server's own `TruthPoints`.
const TRUTH_POINTS = 1;

// A fake always has an author; the guard is for a round that arrives without one.
function authorsOf(option: FFOption, nameOf: (id: string) => string): string[] {
    const ids = option.authorIds ?? (option.authorId === undefined ? [] : [option.authorId]);

    return ids.filter(id => id !== TRUTH_AUTHOR_ID).map(nameOf);
}

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

    const facts = game.gameMode === 'facts';

    // The card this viewer picked. A round's own authors never voted on it, so they get no verdict.
    const myCard = revealed && round.myVoteSlot !== undefined
        ? options.find(option => option.slot === round.myVoteSlot)
        : undefined;

    const myAuthor = myCard === undefined ? '' : joinNames(authorsOf(myCard, nameOf), t('common.and'));

    const verdict: VerdictContent | null = myCard === undefined
        ? null
        // Nothing is right or wrong without a truth to be right about, so the strip only names who you picked.
        : !facts ? {
            verdict: 'picked',
            title: t('fakeFiller.play.reveal.verdict.pickedTitle', { author: myAuthor }),
            reason: t('fakeFiller.play.reveal.verdict.pickedReason', { count: myCard.voters?.length ?? 0 })
        } : myCard.isTruth === true ? {
            verdict: 'hit',
            title: t('fakeFiller.play.reveal.verdict.hitTitle'),
            reason: t('fakeFiller.play.reveal.verdict.hitReason'),
            points: t('fakeFiller.play.reveal.points', { points: TRUTH_POINTS })
        } : {
            verdict: 'miss',
            title: t('fakeFiller.play.reveal.verdict.missTitle'),
            reason: t('fakeFiller.play.reveal.verdict.missReason', { author: myAuthor }),
            points: t('fakeFiller.play.reveal.points', { points: 0 })
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
                {verdict !== null && <RoundVerdict {...verdict} />}

                {options.map((option, index) => {
                    const letter = String.fromCharCode(LETTER_A + index);

                    return (
                        <Fragment key={option.slot}>
                            {index > 0 && <Or />}

                            {revealed ? (
                                <RevealedOption
                                    index={index}
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
                            // Ink, so the only mint on a reveal is the band and the real answer.
                            tone='ink'
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
    const mobile = Platform.OS !== 'web';

    if (width < 380) return mobile ? 16 : 18;

    return mobile ? 19 : 21;
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

/** Everything the strip above the cards says, built where the round is known. */
interface VerdictContent {
    verdict: Verdict,
    title: string,
    reason: string,
    points?: string
}

interface RevealedOptionProps {
    // Which way the stamp leans.
    index: number,
    letter: string,
    line: string,
    option: FFOption,
    game: FFGame,
    userId: string,
    mine: boolean,
    nameOf: (id: string) => string
}

// The same card once the round is told: the fill says what the answer was, the stamp says who wrote it.
function RevealedOption({ index, letter, line, option, game, userId, mine, nameOf }: RevealedOptionProps) {
    const t = useT();
    const styles = useStyles();
    const size = useLineSize();

    const facts = game.gameMode === 'facts';
    const truth = option.isTruth === true;
    const voters = option.voters ?? [];

    const authors = truth ? [] : authorsOf(option, nameOf);
    const shared = authors.length > 1;
    const author = joinNames(authors, t('common.and'));

    // Only a mode with a truth tints anything, because only there does one card mean something the other does not.
    const fill = !facts ? styles.optionNeutral : truth ? styles.optionTruth : styles.optionFake;

    const stamp = truth
        ? t('fakeFiller.play.reveal.stamp.real')
        : authors.length === 0
            ? null
            : shared
                ? t('fakeFiller.play.reveal.stamp.more', { name: authors[0], count: authors.length - 1 })
                : authors[0];

    const meta = truth
        ? t('fakeFiller.play.reveal.meta.real')
        : authors.length === 0
            ? null
            : facts
                ? t(shared ? 'fakeFiller.play.reveal.meta.fakeShared' : 'fakeFiller.play.reveal.meta.fake', { author })
                : t(shared ? 'fakeFiller.play.reveal.meta.answerShared' : 'fakeFiller.play.reveal.meta.answer', { author });

    const votersLabel = !facts
        ? t('fakeFiller.play.reveal.voters.chose')
        : truth ? t('fakeFiller.play.reveal.voters.knew') : t('fakeFiller.play.reveal.voters.fell');

    return (
        <View
            accessible
            accessibilityLabel={`${t('fakeFiller.play.voting.option', { letter })}: ${fillPrompt(line, option.fills)}. ${meta ?? ''}`}
            style={[styles.option, fill]}
        >
            {/* The stamp rides in the flow, so the row reserves its height and it can never land on the sentence. */}
            <View style={styles.revealHead}>
                <View style={styles.letter}>
                    <AppText style={styles.letterText}>{letter}</AppText>
                </View>

                {mine && (
                    <View style={styles.mineTag}>
                        <AppText style={styles.mineTagText}>{t('fakeFiller.play.voting.yourPick')}</AppText>
                    </View>
                )}

                <View style={styles.headSpacer} />

                {stamp !== null && (
                    <View style={[styles.stamp, index % 2 === 0 ? styles.stampLeaning : styles.stampCounter]}>
                        <AppText style={styles.stampText} numberOfLines={1} ellipsizeMode='tail'>
                            {stamp}
                        </AppText>
                    </View>
                )}
            </View>

            <FilledLine
                line={line}
                fills={option.fills}
                size={size}
                leading={1.55}
                pill
                color={facts ? Brand.ink : undefined}
            />

            {meta !== null && (
                <View style={styles.meta}>
                    <AppText style={[styles.metaText, facts && styles.metaTextOnBrand]}>{meta}</AppText>

                    {/* Only a fake pays, and it pays its author a point per person it fooled. */}
                    {!truth && (
                        <View style={styles.metaPoints}>
                            <AppText style={styles.metaPointsText}>
                                {t('fakeFiller.play.reveal.points', { points: voters.length })}
                            </AppText>
                        </View>
                    )}
                </View>
            )}

            <VoterBubbles
                voters={voters}
                players={game.players}
                userId={userId}
                label={votersLabel}
                onBrand={facts}
            />
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
        gap: Spacing.two + Spacing.one,
        padding: Spacing.three,
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
    // The real answer, whoever picked it.
    optionTruth: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },
    // Somebody made this one up, whoever fell for it.
    optionFake: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.blush
    },
    // No truth exists in this mode, so no card has anything to be tinted for.
    optionNeutral: {
        backgroundColor: theme.colors.backgroundElement
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
    // Never wraps: the stamp overhangs the card's padding, and the row reserves the height it leans into.
    revealHead: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
        marginRight: -22
    },
    headSpacer: {
        flex: 1
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
    // The one thing on the reveal that says anything about the viewer, so it has to sit on either fill.
    mineTag: {
        paddingVertical: Spacing.one,
        paddingHorizontal: 10,
        borderRadius: Radii.full,
        backgroundColor: Brand.ink
    },
    mineTagText: {
        fontSize: 10.5,
        fontWeight: 900,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: Brand.lemon
    },
    stamp: {
        flexShrink: 1,
        maxWidth: STAMP_MAX_WIDTH,
        paddingVertical: Spacing.one + 2,
        paddingHorizontal: 13,
        borderRadius: 9,
        borderWidth: 2.5,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },
    stampLeaning: {
        transform: [{ rotate: '6deg' }]
    },
    stampCounter: {
        transform: [{ rotate: '-5deg' }]
    },
    // Truncates rather than wraps: a second line would grow the head and jog the card.
    stampText: {
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.colors.text
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    metaText: {
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        lineHeight: 17,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },
    metaTextOnBrand: {
        color: withAlpha(Brand.ink, 0.72)
    },
    metaPoints: {
        flexShrink: 0,
        height: 34,
        minWidth: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },
    metaPointsText: {
        fontSize: 15,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: Brand.ink
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
        paddingVertical: Spacing.one,
        paddingHorizontal: 12,
        borderRadius: Radii.full,
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
