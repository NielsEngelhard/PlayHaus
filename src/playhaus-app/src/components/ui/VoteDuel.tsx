import AppText from "@/components/text/AppText";
import BleedScrollView from "@/components/ui/BleedScrollView";
import Card from "@/components/ui/Card";
import FlipOver from "@/components/ui/FlipOver";
import type { ScoredPlayer } from "@/components/ui/lobby-seat";
import PlayButton from "@/components/ui/PlayButton";
import PlayerScoreRow from "@/components/ui/PlayerScoreRow";
import PopPressable from "@/components/ui/PopPressable";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { useEntrance } from "@/components/ui/useEntrance";
import VoterBubbles from "@/components/ui/VoterBubbles";
import type { Game } from "@/constants/games";
import { Brand, Radii, Spacing, withAlpha } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Fragment, useState, type ReactNode } from "react";
import { Animated, Easing, View } from "react-native";

// A card the table can vote for, identified by the shuffled position it is shown in.
export interface DuelOption {
    slot: number
}

export interface DuelLabels {
    or: string,
    tapToPick: string,
    voted: string,
    yourPick: string,
    // What a screen reader calls a card, given its letter.
    option: (letter: string) => string,
    progress: string,
    waiting: string,
    confirm: string,
    busy: string,
    next: string,
    toResults: string,
    waitingForHost: string,
    waitingForResults: string,
    noVoters: string
}

interface Props<T extends DuelOption> {
    game: Game,
    options: T[],
    revealed: boolean,
    // The slot the viewer voted for, once they have.
    myVoteSlot?: number,
    canVote: boolean,
    busy: boolean,
    onVote: (slot: number) => void,
    // Drawn above the cards: the prompt, or a note to a viewer who cannot vote.
    header?: ReactNode,
    // The body of a card before the reveal, and whether the viewer has it picked.
    renderFront: (option: T, active: boolean) => ReactNode,
    // The body of the same card once the round is told.
    renderBack: (option: T) => ReactNode,
    // What a screen reader reads for a card's body.
    spokenOf: (option: T) => string,
    // The fill a picked card wears before the reveal.
    activeFill: string,
    // The fill a card turns over to.
    backFill: (option: T) => string,
    // The name slammed onto a revealed card, or null for none.
    stampOf: (option: T) => string | null,
    // Extra tags beside the stamp on a revealed card.
    tagsOf?: (option: T) => ReactNode,
    votersOf: (option: T) => string[],
    players: ScoredPlayer[],
    userId: string,
    // Whether there is another round behind this one, which changes what the button says.
    more: boolean,
    isHost: boolean,
    advancing: boolean,
    onContinue: () => void,
    labels: DuelLabels
}

const LETTER_A = 65;

const DEAL_MS = 460;
const DEAL_STAGGER_MS = 110;
const DEAL_DROP = 48;
const DEAL_TILT = 4;

const FLIP_STAGGER_MS = 260;
// Both halves of a FlipOver turn, rounded up.
const FLIP_MS = 400;

const STAMP_DELAY_MS = 120;
const STAMP_MS = 360;
const STAMP_SCALE = 1.9;
const STAMP_LEAN = 6;
const STAMP_COUNTER = -5;

const VOTERS_DELAY_MS = STAMP_DELAY_MS + STAMP_MS;

const FOOT_RISE = 16;
const FOOT_MS = 320;

// How many letters of a name the stamp shows before it cuts.
const STAMP_MAX_LETTERS = 18;

// Wide enough for that many uppercase letters plus the ellipsis, so the width never cuts a name the letter count would have let through.
const STAMP_MAX_WIDTH = 232;

const LETTER_SIZE = 30;

// Cut by letters rather than by width, so every name that is too long loses its tail at the same place.
export function clipName(name: string): string {
    return name.length > STAMP_MAX_LETTERS ? `${name.slice(0, STAMP_MAX_LETTERS)}…` : name;
}

// One round from vote to verdict: tap a card and lock it in, then the same cards turn over to show who wrote what.
export default function VoteDuel<T extends DuelOption>(props: Props<T>) {
    const { game, revealed, myVoteSlot, canVote, busy, onVote, header, labels, players, userId, more, isHost, advancing, onContinue } = props;
    const styles = useStyles();

    // The option under the finger, before it is committed.
    const [picked, setPicked] = useState<number | undefined>(undefined);

    const voted = myVoteSlot !== undefined;
    // Slot order in both phases, so no card moves when the round is told.
    const options = [...props.options].sort((left, right) => left.slot - right.slot);
    const chosen = voted ? myVoteSlot : picked;

    return (
        <BleedScrollView
            // The board is chromeless, so there is no page gutter to bleed into.
            bleed={0}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {header}

            <View style={styles.options} accessibilityRole={revealed ? undefined : 'radiogroup'}>
                {options.map((option, index) => {
                    const letter = String.fromCharCode(LETTER_A + index);

                    return (
                        <Fragment key={option.slot}>
                            {index > 0 && <Or index={index} label={labels.or} />}

                            <DealtCard index={index}>
                                <FlipOver
                                    style={styles.slotFill}
                                    turned={revealed}
                                    delayMs={index * FLIP_STAGGER_MS}
                                    front={(
                                        <Front
                                            letter={letter}
                                            spoken={`${labels.option(letter)}: ${props.spokenOf(option)}`}
                                            active={chosen === option.slot}
                                            activeFill={props.activeFill}
                                            voted={voted}
                                            // Once the vote is in, everything that was not picked steps back.
                                            faded={voted && chosen !== option.slot}
                                            disabled={busy || voted || !canVote}
                                            labels={labels}
                                            onPress={() => setPicked(option.slot)}
                                        >
                                            {props.renderFront(option, chosen === option.slot)}
                                        </Front>
                                    )}
                                    back={(
                                        <Back
                                            index={index}
                                            letter={letter}
                                            spoken={`${labels.option(letter)}: ${props.spokenOf(option)}`}
                                            fill={props.backFill(option)}
                                            stamp={props.stampOf(option)}
                                            tags={props.tagsOf?.(option)}
                                            mine={myVoteSlot === option.slot}
                                            labels={labels}
                                            voters={props.votersOf(option)}
                                            players={players}
                                            userId={userId}
                                        >
                                            {props.renderBack(option)}
                                        </Back>
                                    )}
                                />
                            </DealtCard>
                        </Fragment>
                    );
                })}
            </View>

            {revealed ? (
                // Waits for the last card to finish turning.
                <SlideFadeIn
                    offsetY={FOOT_RISE}
                    durationMs={FOOT_MS}
                    delayMs={options.length * FLIP_STAGGER_MS + FLIP_MS}
                    style={styles.foot}
                >
                    <PlayerScoreRow players={players} userId={userId} />

                    {isHost ? (
                        <PlayButton
                            game={game}
                            // Ink, so the only accent on a reveal is the band and the winning card.
                            tone='ink'
                            text={more ? labels.next : labels.toResults}
                            icon='arrow-right'
                            disabled={advancing}
                            onPress={onContinue}
                        />
                    ) : (
                        <Card style={styles.hostWait}>
                            <AppText style={styles.hostWaitText}>
                                {more ? labels.waitingForHost : labels.waitingForResults}
                            </AppText>
                        </Card>
                    )}
                </SlideFadeIn>
            ) : (
                <View style={styles.foot}>
                    <AppText style={styles.progress}>{labels.progress}</AppText>

                    {canVote && (voted ? (
                        <AppText style={styles.waiting}>{labels.waiting}</AppText>
                    ) : (
                        <PlayButton
                            game={game}
                            tone='ink'
                            text={busy ? labels.busy : labels.confirm}
                            disabled={busy || picked === undefined}
                            onPress={() => {
                                if (picked !== undefined) onVote(picked);
                            }}
                        />
                    ))}
                </View>
            )}
        </BleedScrollView>
    )
}

// One card slot, dealt onto the table in turn when the round opens.
function DealtCard({ index, children }: { index: number, children: ReactNode }) {
    const styles = useStyles();

    const deal = useEntrance({
        delayMs: index * DEAL_STAGGER_MS,
        durationMs: DEAL_MS,
        easing: Easing.out(Easing.back(1.3))
    });

    const tilt = index % 2 === 0 ? -DEAL_TILT : DEAL_TILT;

    return (
        <Animated.View
            style={[
                styles.slot,
                {
                    opacity: deal.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                    transform: [
                        { translateY: deal.interpolate({ inputRange: [0, 1], outputRange: [DEAL_DROP, 0] }) },
                        { rotate: deal.interpolate({ inputRange: [0, 1], outputRange: [`${tilt}deg`, '0deg'] }) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    )
}

// The "or" between two cards, which is what makes a pair of them read as a duel.
function Or({ index, label }: { index: number, label: string }) {
    const styles = useStyles();

    // Pops up between the two cards once the second has landed.
    const pop = useEntrance({
        delayMs: index * DEAL_STAGGER_MS + DEAL_MS / 2,
        durationMs: DEAL_MS,
        easing: Easing.out(Easing.back(2.5))
    });

    return (
        <View style={styles.or} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
            <View style={styles.orRule} />

            <Animated.View style={[styles.orChip, { transform: [{ scale: pop }] }]}>
                <AppText style={styles.orText}>{label}</AppText>
            </Animated.View>

            <View style={styles.orRule} />
        </View>
    )
}

interface FrontProps {
    letter: string,
    spoken: string,
    active: boolean,
    activeFill: string,
    voted: boolean,
    faded: boolean,
    disabled: boolean,
    labels: DuelLabels,
    onPress: () => void,
    children: ReactNode
}

// One thing to vote for, before anybody knows who wrote it.
function Front({ letter, spoken, active, activeFill, voted, faded, disabled, labels, onPress, children }: FrontProps) {
    const styles = useStyles();

    const hint = !active ? labels.tapToPick : voted ? labels.voted : labels.yourPick;

    return (
        <PopPressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='radio'
            accessibilityState={{ checked: active, disabled }}
            accessibilityLabel={spoken}
            style={[styles.option, active && [styles.optionActive, { backgroundColor: activeFill }], faded && styles.faded]}
        >
            <View style={styles.optionHead}>
                <View style={[styles.letter, active && styles.letterActive]}>
                    <AppText style={[styles.letterText, active && { color: activeFill }]}>{letter}</AppText>
                </View>

                {/* Dropped from the cards that lost once the vote is in, where "tap" would be a lie. */}
                {!faded && <AppText style={[styles.hint, active && styles.hintActive]}>{hint}</AppText>}
            </View>

            {children}
        </PopPressable>
    )
}

interface BackProps {
    // Which way the stamp leans.
    index: number,
    letter: string,
    spoken: string,
    fill: string,
    stamp: string | null,
    tags?: ReactNode,
    mine: boolean,
    labels: DuelLabels,
    voters: string[],
    players: ScoredPlayer[],
    userId: string,
    children: ReactNode
}

// The same card once the round is told: the fill says how it went, the stamp says who wrote it.
function Back({ index, letter, spoken, fill, stamp, tags, mine, labels, voters, players, userId, children }: BackProps) {
    const styles = useStyles();

    // Slammed down once the card has turned: the name is the punchline.
    const slam = useEntrance({
        delayMs: STAMP_DELAY_MS,
        durationMs: STAMP_MS,
        easing: Easing.out(Easing.back(2))
    });
    const lean = index % 2 === 0 ? STAMP_LEAN : STAMP_COUNTER;

    return (
        <View
            accessible
            accessibilityLabel={`${spoken}. ${stamp ?? ''}`}
            style={[styles.option, styles.optionRevealed, { backgroundColor: fill }]}
        >
            {/* The stamp rides in the flow, so the row reserves its height and it can never land on the sentence. */}
            <View style={styles.revealHead}>
                <View style={styles.letter}>
                    <AppText style={styles.letterText}>{letter}</AppText>
                </View>

                {mine && (
                    <View style={styles.mineTag}>
                        <AppText style={styles.mineTagText}>{labels.yourPick}</AppText>
                    </View>
                )}

                {tags}

                {stamp !== null && (
                    <Animated.View
                        style={[
                            styles.stamp,
                            {
                                opacity: slam.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                                transform: [
                                    { scale: slam.interpolate({ inputRange: [0, 1], outputRange: [STAMP_SCALE, 1] }) },
                                    { rotate: slam.interpolate({ inputRange: [0, 1], outputRange: [`${lean * 3}deg`, `${lean}deg`] }) }
                                ]
                            }
                        ]}
                    >
                        <AppText style={styles.stampText} numberOfLines={1} ellipsizeMode='tail'>
                            {stamp}
                        </AppText>
                    </Animated.View>
                )}
            </View>

            {children}

            <VoterBubbles
                voters={voters}
                players={players}
                userId={userId}
                emptyLabel={labels.noVoters}
                onBrand
                delayMs={VOTERS_DELAY_MS}
            />
        </View>
    )
}

// The small ink pill a revealed card wears beside its stamp; exported so a game can add its own.
export function DuelTag({ text }: { text: string }) {
    const styles = useStyles();

    return (
        <View style={styles.mineTag}>
            <AppText style={styles.mineTagText}>{text}</AppText>
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
    // A basis of zero rather than the content's own height, so the cards split the stack evenly however much is written on either.
    // `minHeight: 'auto'` overrides the `min-height: 0` React Native Web puts on every flex child — without it, `flexShrink: 0`
    // (RN's own default) stops protecting a card from being squeezed below its text's height on web, and the text spills out.
    slot: {
        flexGrow: 1,
        flexBasis: 0,
        minHeight: 'auto'
    },
    slotFill: {
        flexGrow: 1
    },
    option: {
        flexGrow: 1,
        flexBasis: 0,
        minHeight: 'auto',
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
        borderColor: Brand.ink
    },
    optionRevealed: {
        borderColor: Brand.ink
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
    // The stamp overhangs the card's padding, and the row reserves the height it leans into.
    revealHead: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 9,
        marginRight: -22
    },
    letter: {
        width: LETTER_SIZE,
        height: LETTER_SIZE,
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
    // Wraps onto its own line rather than shrinking, so a full name never loses letters to the badge beside it.
    stamp: {
        flexShrink: 0,
        marginLeft: 'auto',
        maxWidth: STAMP_MAX_WIDTH,
        paddingVertical: Spacing.one + 2,
        paddingHorizontal: 13,
        borderRadius: 9,
        borderWidth: 2.5,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },
    // Truncates rather than wraps: a second line would grow the head and jog the card.
    stampText: {
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.colors.text
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
