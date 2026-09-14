import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { Brand, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT, useUiLanguage } from "@/features/i18n/LanguageContext";
import { groupDigits, reviewGuesses, type ClosestTurn } from "@/features/pubquizr/round-three";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import GuessChips from "./GuessChips";
import NumberPad from "./NumberPad";
import ScriptCard from "./ScriptCard";
import TurnStrip from "./TurnStrip";

// The page's own horizontal padding, which the pad has to undo to reach the edges.
const PAGE_PADDING = Spacing.four;

// As long a number as one field will hold at 21 points.
const MAX_DIGITS = 12;

/** Which half of the turn is on screen: reading it out, or writing the numbers down. */
type Stage = 'reading' | 'collecting';

interface Props {
    turn: ClosestTurn
    /** Which round this is, for the strip's pips. */
    round: number
    /** What the strip says: nobody in particular is being asked in this round. */
    lead: string
    busy: boolean
    error: TranslationKey | null
    // `winners` travels alongside the request body because it is the one thing the server's reply will not hand back on its own.
    onSettle: (
        settled: { guesses: { seat: number, value: number }[] } | { winningSeats: number[] },
        winners: Seat[]
    ) => void
}

// The board for round 3: one number each, and whoever lands nearest.
export default function ClosestBoard({ turn, round, lead, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const language = useUiLanguage();

    const [stage, setStage] = useState<Stage>('reading');
    const [typed, setTyped] = useState<Record<number, string>>({});
    /** Whose field the pad is typing into. */
    const [focused, setFocused] = useState<number | null>(null);
    /** Dropped out of typing and picking the winner by hand instead. */
    const [byHand, setByHand] = useState(false);
    const [picked, setPicked] = useState<number | null>(null);
    /** Standing in front of a settle that would leave somebody's row blank. */
    const [confirming, setConfirming] = useState(false);

    // Reset during render, the same way the hot seat board resets its ritual.
    const [settledId, setSettledId] = useState<string | null>(null);
    if (settledId !== turn.dealt.id) {
        setSettledId(turn.dealt.id);
        setStage('reading');
        setTyped({});
        setFocused(null);
        setByHand(false);
        setPicked(null);
        setConfirming(false);
    }

    const review = reviewGuesses(
        turn.guessing.map(seat => ({ seat: seat.seat, text: typed[seat.seat] ?? '' })),
        turn.answer
    );

    const problem: TranslationKey | null = review.duplicates.length > 0
        ? 'pubquizr.play.closest.duplicate'
        : review.unreadable.length > 0
            ? 'pubquizr.play.closest.unreadable'
            : null;

    const ready = byHand
        ? picked !== null
        : review.guesses.length > 0 && problem === null;

    /** Everybody whose row is still empty, and how many are not. */
    const blank = turn.guessing.filter(seat => (typed[seat.seat] ?? '').trim() === '');
    const filled = turn.guessing.length - blank.length;

    function settle() {
        if (!ready || busy) return;

        if (byHand) {
            if (picked === null) return;
            const seat = turn.guessing.find(candidate => candidate.seat === picked);
            onSettle({ winningSeats: [picked] }, seat === undefined ? [] : [seat]);
            return;
        }

        // A blank row is legal — `reviewGuesses` drops it rather than complaining.
        if (blank.length > 0) {
            setConfirming(true);
            return;
        }

        send();
    }

    // The settle itself, past whatever stood in front of it.
    function send() {
        setConfirming(false);
        if (!ready || busy) return;

        const winners = turn.guessing.filter(seat => review.winners.includes(seat.seat));
        onSettle({ guesses: review.guesses }, winners);
    }

    /** Append what a pad key produced to whoever's field is in focus. */
    function press(character: string) {
        if (focused === null) return;

        setTyped(current => {
            const held = current[focused] ?? '';
            // A guess nobody could read out is not a guess.
            if (held.length >= MAX_DIGITS) return current;

            return { ...current, [focused]: held + character };
        });
    }

    function backspace() {
        if (focused === null) return;

        setTyped(current => ({
            ...current,
            [focused]: (current[focused] ?? '').slice(0, -1)
        }));
    }

    // The same strip every other round wears, on both halves of this one.
    const strip = (
        <TurnStrip
            quizmaster={turn.quizmaster}
            answering={null}
            lead={lead}
            run={0}
            round={round}
            number={turn.number}
            total={turn.total}
            worth={turn.worth}
        />
    );

    if (stage === 'reading') {
        return (
            <View style={styles.turn}>
                {strip}

                <ScriptCard prompt={turn.question.prompt} size={31}>
                    <View style={styles.stake}>
                        <Feather name="award" size={13} color={Brand.ink} />

                        <AppText style={styles.stakeLabel}>
                            {t('pubquizr.play.closest.nearestTakes', { worth: turn.worth })}
                        </AppText>
                    </View>

                    <View style={styles.guessingRule}>
                        <AppText style={styles.guessingLabel}>
                            {t('pubquizr.play.closest.guessingOrder')}
                        </AppText>

                        {/* Who is playing for it, as faces rather than as a list of names. */}
                        <View style={styles.guessers}>
                            {turn.guessing.map(seat => (
                                <View
                                    key={seat.seat}
                                    style={[styles.guesser, { backgroundColor: seat.swatch.color }]}
                                    accessibilityRole="text"
                                    accessibilityLabel={seat.name}
                                >
                                    <AppText
                                        style={[styles.guesserInitials, { color: seat.swatch.foreground }]}
                                    >
                                        {seat.initials}
                                    </AppText>
                                </View>
                            ))}
                        </View>
                    </View>
                </ScriptCard>

                <View style={styles.collect}>
                    <PopPressable
                        onPress={() => {
                            setStage('collecting');
                            // Somewhere to type before the first row is tapped: the pad arriving with nothing in focus is a pad that does nothing.
                            setFocused(current => current ?? turn.guessing[0]?.seat ?? null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('pubquizr.play.closest.collect')}
                        style={styles.collectButton}
                    >
                        <Feather name="edit-3" size={18} color={Brand.ink} />

                        <AppText style={styles.collectLabel}>
                            {t('pubquizr.play.closest.collect')}
                        </AppText>
                    </PopPressable>

                    <AppText style={styles.hint}>
                        {t('pubquizr.play.closest.collectHint')}
                    </AppText>
                </View>
            </View>
        )
    }

    const modeSwitch = (
        <Pressable
            onPress={() => { setByHand(current => !current); setPicked(null); }}
            disabled={busy}
            accessibilityRole="button"
            style={styles.switch}
        >
            <Feather
                name={byHand ? 'edit-3' : 'zap'}
                size={13}
                color={theme.colors.textMuted}
            />

            <AppText style={styles.switchText}>
                {byHand
                    ? t('pubquizr.play.closest.typeInstead')
                    : t('pubquizr.play.closest.pickInstead')}
            </AppText>
        </Pressable>
    );

    const failure = error !== null && (
        <InlineNotification
            icon="alert-triangle"
            color={theme.colors.blush}
            message={t(error)}
        />
    );

    if (byHand) {
        return (
            <View style={styles.screen}>
                <View style={styles.body}>
                    {strip}

                    <Label label={turn.question.prompt} />

                    <View style={styles.sectionRule}>
                        <AppText style={styles.sectionLabel}>
                            {t('pubquizr.play.closest.theirNumbers')}
                        </AppText>

                        <View style={styles.rule} />

                        <AppText style={styles.sectionCount}>
                            {t('pubquizr.play.closest.filled', {
                                filled,
                                total: turn.guessing.length
                            })}
                        </AppText>
                    </View>

                    <ScrollView
                        style={styles.rows}
                        contentContainerStyle={styles.rowsInner}
                    >
                        {turn.guessing.map(seat => {
                            const chosen = picked === seat.seat;

                            return (
                                <Pressable
                                    key={seat.seat}
                                    onPress={() => setPicked(seat.seat)}
                                    disabled={busy}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: chosen }}
                                    accessibilityLabel={seat.name}
                                    style={[styles.row, chosen && styles.chosen]}
                                >
                                    <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
                                        <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                                            {seat.initials}
                                        </AppText>
                                    </View>

                                    <View style={styles.who}>
                                        <AppText
                                            style={[styles.name, chosen && styles.onMint]}
                                            numberOfLines={1}
                                        >
                                            {seat.name}
                                        </AppText>
                                    </View>

                                    <Feather
                                        name={chosen ? 'check-circle' : 'circle'}
                                        size={20}
                                        color={chosen ? Brand.ink : theme.colors.textMuted}
                                    />
                                </Pressable>
                            )
                        })}
                    </ScrollView>

                    {failure}

                    <View style={styles.footer}>
                        <ActionButton
                            size="large"
                            icon="award"
                            text={t('pubquizr.play.closest.award')}
                            disabled={!ready || busy}
                            onPress={settle}
                        />

                        {modeSwitch}
                    </View>
                </View>
            </View>
        )
    }

    const index = turn.guessing.findIndex(seat => seat.seat === focused);
    const current = index === -1 ? null : turn.guessing[index];
    const previous = index > 0 ? turn.guessing[index - 1] : null;
    const next = index !== -1 && index < turn.guessing.length - 1 ? turn.guessing[index + 1] : null;

    const text = current === null ? '' : typed[current.seat] ?? '';
    const shown = groupDigits(text, language);
    const value = Number(text.replace(',', '.'));
    const readable = text.trim() !== '' && text !== '-' && Number.isFinite(value);
    // Twelve digits have to fit on web too, where `adjustsFontSizeToFit` does nothing.
    const numberSize = shown.length <= 7 ? 54 : shown.length <= 9 ? 44 : 34;

    const subline = [
        turn.unit,
        !turn.quizmasterGuesses && readable
            ? t('pubquizr.play.closest.off', { off: Math.abs(value - turn.answer).toLocaleString(language) })
            : ''
    ].filter(part => part !== '').join(' · ');

    return (
        <View style={styles.screen}>
            <View style={styles.body}>
                {strip}

                <AppText style={styles.prompt}>{turn.question.prompt}</AppText>

                {/* Hidden at the smallest table the game allows, where the reader guesses too. */}
                {!turn.quizmasterGuesses && (
                    <View style={styles.answer}>
                        <Feather name="award" size={14} color={Brand.ink} />

                        <AppText style={styles.answerText} numberOfLines={1}>
                            {t('pubquizr.play.closest.answerIs', { answer: turn.answer.toLocaleString(language) })}
                        </AppText>

                        <View style={styles.answerWorth}>
                            <AppText style={styles.answerWorthText}>
                                {t('pubquizr.play.closest.points', { worth: turn.worth })}
                            </AppText>
                        </View>
                    </View>
                )}

                <GuessChips
                    busy={busy}
                    clashing={review.duplicates}
                    focused={focused}
                    guessing={turn.guessing}
                    onFocus={setFocused}
                    typed={typed}
                />

                <View style={styles.focus}>
                    {current !== null && (
                        <>
                            <View style={styles.speaker}>
                                <View style={[styles.avatar, { backgroundColor: current.swatch.color }]}>
                                    <AppText style={[styles.initials, { color: current.swatch.foreground }]}>
                                        {current.initials}
                                    </AppText>
                                </View>

                                <AppText style={styles.says} numberOfLines={1}>
                                    {t('pubquizr.play.closest.says', { name: current.name })}
                                </AppText>
                            </View>

                            <View style={styles.number}>
                                <AppText
                                    style={[
                                        styles.numberText,
                                        { fontSize: numberSize, lineHeight: numberSize * 1.05 },
                                        text === '' && styles.numberEmpty
                                    ]}
                                    numberOfLines={1}
                                >
                                    {text === '' ? t('pubquizr.play.closest.placeholder') : shown}
                                </AppText>

                                <View style={[styles.caret, { height: numberSize * 0.8 }]} />
                            </View>

                            {subline !== '' && (
                                <AppText style={styles.subline}>{subline}</AppText>
                            )}
                        </>
                    )}

                    {problem !== null && (
                        <AppText style={styles.problem}>{t(problem)}</AppText>
                    )}
                </View>

                {failure}

                <View style={styles.footer}>
                    <View style={styles.nav}>
                        {previous !== null && (
                            <Pressable
                                onPress={() => setFocused(previous.seat)}
                                disabled={busy}
                                accessibilityRole="button"
                                accessibilityLabel={t('pubquizr.play.closest.entry', { name: previous.name })}
                                style={styles.back}
                            >
                                <Feather name="chevron-left" size={15} color={theme.colors.textMuted} />

                                <AppText style={styles.backText} numberOfLines={1}>{previous.name}</AppText>
                            </Pressable>
                        )}

                        {next !== null ? (
                            <PopPressable
                                onPress={() => setFocused(next.seat)}
                                disabled={busy}
                                accessibilityRole="button"
                                accessibilityLabel={t('pubquizr.play.closest.entry', { name: next.name })}
                                style={styles.forward}
                            >
                                <AppText style={styles.forwardText} numberOfLines={1}>{next.name}</AppText>

                                <Feather name="chevron-right" size={15} color={Brand.ink} />
                            </PopPressable>
                        ) : (
                            <PopPressable
                                onPress={settle}
                                disabled={!ready || busy}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: !ready || busy }}
                                style={[styles.forward, (!ready || busy) && styles.forwardDisabled]}
                            >
                                <Feather name="award" size={15} color={Brand.ink} />

                                <AppText style={styles.forwardText} numberOfLines={1}>
                                    {t('pubquizr.play.validate')}
                                </AppText>
                            </PopPressable>
                        )}
                    </View>

                    {modeSwitch}
                </View>
            </View>

            <NumberPad
                onKey={press}
                onBackspace={backspace}
                disabled={busy || focused === null}
                style={styles.pad}
            />

            {/* Dismissable, unlike the panels that stand in front of something dangerous. */}
            <PopupModal
                visible={confirming}
                title={t('pubquizr.play.closest.missingTitle')}
                message={blank.length === 1
                    ? t('pubquizr.play.closest.missingOne', { names: blank[0].name })
                    : t('pubquizr.play.closest.missingMany', {
                        names: blank.map(seat => seat.name).join(', ')
                    })}
                tone="info"
                onRequestClose={() => setConfirming(false)}
                actions={<>
                    <TextButton
                        text={t('pubquizr.play.closest.missingBack')}
                        variant="primary"
                        fullWidth
                        onPress={() => {
                            setConfirming(false);
                            if (blank.length > 0) setFocused(blank[0].seat);
                        }}
                    />

                    <TextButton
                        text={t('pubquizr.play.closest.missingAnyway')}
                        variant="muted"
                        fullWidth
                        disabled={busy}
                        onPress={send}
                    />
                </>}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // The reading screen, which is a board like any other.
    turn: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    // The collecting screen, which is a board with a pad bolted to the bottom of it.
    screen: {
        marginTop: 12,
        flex: 1,
        minHeight: 0
    },

    body: {
        flex: 1,
        minHeight: 0,
        gap: 12
    },


    // Mint, because it is the same "this is what it pays" the badge on the strip wears in every other round.
    stake: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 4,
        paddingHorizontal: 11,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    stakeLabel: {
        fontSize: 11.5,
        fontWeight: 900,
        color: Brand.ink
    },

    guessingRule: {
        marginTop: 22,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: theme.colors.borderMuted
    },

    guessingLabel: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },

    guessers: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },

    guesser: {
        width: 38,
        height: 38,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    guesserInitials: {
        fontSize: 12,
        fontWeight: 900
    },

    collect: {
        flexShrink: 0
    },

    // Mint: this one is not a gate in front of anything irreversible, it is the turn carrying on.
    collectButton: {
        height: 62,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hard
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    collectLabel: {
        fontSize: 16,
        fontWeight: 900,
        color: Brand.ink
    },

    hint: {
        marginTop: 9,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    },


    sectionRule: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 2
    },

    sectionLabel: {
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.3,
        color: theme.colors.textMuted
    },

    rule: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.borderMuted
    },

    sectionCount: {
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    rows: {
        flex: 1,
        minHeight: 0
    },

    rowsInner: {
        gap: 9,
        paddingBottom: 2
    },

    // 60 points and a 36-point swatch, up from 46 and 30.
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        height: 60,
        paddingLeft: 10,
        paddingRight: 12,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // Mint in both schemes, the same "this one" the Correct button wears.
    chosen: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hardSmall
    },

    avatar: {
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 12,
        fontWeight: 900
    },

    who: {
        flex: 1,
        minWidth: 0
    },

    name: {
        fontSize: 15.5,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    prompt: {
        flexShrink: 0,
        fontSize: 15,
        lineHeight: 15 * 1.3,
        fontWeight: 800,
        color: theme.colors.text
    },

    // Mint in both schemes, the same "this is what it pays" the stake badge wears.
    answer: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 7,
        paddingHorizontal: 11,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint
    },

    answerText: {
        flex: 1,
        minWidth: 0,
        fontSize: 12.5,
        fontWeight: 900,
        color: Brand.ink
    },

    answerWorth: {
        flexShrink: 0,
        paddingVertical: 1,
        paddingHorizontal: 7,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    answerWorthText: {
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: Brand.ink
    },

    // The one part that grows, so the number sits in the middle of whatever room is left.
    focus: {
        flex: 1,
        minHeight: 0,
        justifyContent: 'center',
        gap: 6
    },

    speaker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9
    },

    says: {
        flex: 1,
        minWidth: 0,
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: -0.7,
        color: theme.colors.text
    },

    // Indented past the avatar, so the number reads as what the name said.
    number: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        paddingLeft: 45
    },

    numberText: {
        flexShrink: 1,
        fontWeight: 900,
        letterSpacing: -2.4,
        color: theme.colors.text
    },

    numberEmpty: {
        color: theme.colors.textFaint
    },

    // Drawn rather than real: nothing here is a text field.
    caret: {
        width: 3,
        marginBottom: 5,
        backgroundColor: theme.colors.focus
    },

    subline: {
        paddingLeft: 45,
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    onMint: {
        color: Brand.ink
    },

    problem: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.destructiveText
    },

    footer: {
        flexShrink: 0,
        gap: 2
    },

    nav: {
        flexDirection: 'row',
        gap: 9
    },

    back: {
        flex: 1,
        minWidth: 0,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderMuted
    },

    backText: {
        flexShrink: 1,
        fontSize: 13,
        fontWeight: 900,
        color: theme.colors.textMuted
    },

    // Lemon in both schemes, with ink on it in both.
    forward: {
        flex: 1.3,
        minWidth: 0,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon,
        ...theme.shadows.hard
    },

    forwardDisabled: {
        opacity: 0.5
    },

    forwardText: {
        flexShrink: 1,
        fontSize: 13.5,
        fontWeight: 900,
        color: Brand.ink
    },

    switch: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 8
    },

    switchText: {
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    // Out to the glass on three sides.
    pad: {
        marginTop: 12,
        marginHorizontal: -PAGE_PADDING,
        marginBottom: -PAGE_PADDING
    }
}))
