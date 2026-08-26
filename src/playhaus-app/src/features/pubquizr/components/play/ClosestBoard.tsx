import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { Brand, fontFamilyForWeight, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { reviewGuesses, type ClosestTurn } from "@/features/pubquizr/round-three";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import BackstagePanel from "./BackstagePanel";
import NumberPad from "./NumberPad";
import QuestionRecap from "./QuestionRecap";
import ScriptCard from "./ScriptCard";
import TurnStrip from "./TurnStrip";

/**
 * The page's own horizontal padding, which the pad has to undo to reach the edges.
 *
 * Named rather than inlined because it is a fact about somewhere else: `fullScreenContent`
 * in `app/_layout.tsx` pads every full-screen page by this much, and the pad is the one
 * thing on this screen that should not be inside it — a keyboard that stops short of the
 * glass reads as a card, and the keys lose the width.
 */
const PAGE_PADDING = Spacing.four;

/**
 * As long a number as one field will hold at 21 points.
 *
 * Not a rule about guesses — it is a rule about the box. Past this the digits scroll out
 * of sight and the quizmaster is typing blind, which is worse than being told to stop.
 */
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
    onSettle: (settled: { guesses: { seat: number, value: number }[] } | { winningSeats: number[] }) => void
}

/**
 * The board for round 3: one number each, and whoever lands nearest.
 *
 * A form rather than two buttons, because the whole turn is settled at once — there is no
 * seat being asked and nothing to pass along. The quizmaster reads the question out,
 * everybody says a number, and these rows are where the numbers go.
 *
 * Typing them in is worth the trouble and is why it is the default: it puts the guesses
 * on the record, so a table can argue about them at the end of the night, and it means
 * nobody has to do the subtraction out loud. But a table that has already agreed who was
 * closest should not have to type four numbers to say so, so there is a way to just tap
 * the winner — the same turn settled with less written down.
 *
 * Two screens rather than one, and the split is the fix for what a five-person test found.
 * All of it used to be on screen together: question, answer panel, a scrolling list of
 * fields, and the button. The list was a scroller inside the one flexed card, so the
 * question shrank to nothing to make room for it, and touching a field brought up the
 * system keyboard over the rest of the form — leaving a nested scroll, under a keyboard,
 * as the way to reach the fourth guesser and the button that ends the turn.
 *
 * Now the question gets a screen of its own to be read from, and the form gets a screen
 * of its own with the rows as its only scroller and its own pad along the bottom. Nothing
 * appears, nothing moves, and the award button is visible from the first number to the
 * last.
 *
 * The answer stays behind the covered panel until it is asked for, exactly as in every
 * other round: this screen is the one thing that can spoil the question, and the numbers
 * being typed in are being said out loud as they are typed.
 */
export default function ClosestBoard({ turn, round, lead, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [stage, setStage] = useState<Stage>('reading');
    const [revealed, setRevealed] = useState(false);
    const [typed, setTyped] = useState<Record<number, string>>({});
    /** Whose field the pad is typing into. */
    const [focused, setFocused] = useState<number | null>(null);
    /** Dropped out of typing and picking the winner by hand instead. */
    const [byHand, setByHand] = useState(false);
    const [picked, setPicked] = useState<number | null>(null);
    /** Standing in front of a settle that would leave somebody's row blank. */
    const [confirming, setConfirming] = useState(false);

    /*
     * Reset during render, the same way the hot seat board resets its ritual: a new
     * question has to arrive with an empty form and a covered answer in the same commit
     * that brings it, or the board paints once with the last question's numbers under
     * the new question's prompt.
     */
    const [settledId, setSettledId] = useState<string | null>(null);
    if (settledId !== turn.dealt.id) {
        setSettledId(turn.dealt.id);
        setStage('reading');
        setRevealed(false);
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

    // Only once the answer is on screen: marking a row as nearest before the quizmaster
    // has seen the number is the app telling them the answer sideways. The same rule
    // governs the "6 off" lines and the name in the button, which are the same leak said
    // three different ways.
    const marked = revealed ? review.winners : [];

    const problem: TranslationKey | null = review.duplicates.length > 0
        ? 'pubquizr.play.closest.duplicate'
        : review.unreadable.length > 0
            ? 'pubquizr.play.closest.unreadable'
            : null;

    const ready = byHand
        ? picked !== null
        : review.guesses.length > 0 && problem === null;

    const winner = turn.guessing.find(seat => seat.seat === marked[0]) ?? null;

    /** Everybody whose row is still empty, and how many are not. */
    const blank = turn.guessing.filter(seat => (typed[seat.seat] ?? '').trim() === '');
    const filled = turn.guessing.length - blank.length;

    function settle() {
        if (!ready || busy) return;

        if (byHand) {
            if (picked === null) return;
            onSettle({ winningSeats: [picked] });
            return;
        }

        /*
         * A blank row is legal — `reviewGuesses` drops it rather than complaining,
         * because somebody is always at the bar and a rule insisting on everybody would
         * be a screen the quizmaster cannot get off. But it is far likelier to mean the
         * quizmaster has not got to that person yet, and settling is the one thing on
         * this screen that cannot be taken back: the turn goes to the server, the points
         * are paid, and the phone moves on. So it asks first rather than either refusing
         * or quietly leaving somebody out of a round they were playing in.
         */
        if (blank.length > 0) {
            setConfirming(true);
            return;
        }

        send();
    }

    /**
     * The settle itself, past whatever stood in front of it.
     *
     * Guarded again rather than trusting the caller: this is reachable from the panel as
     * well as from the button, and the panel is on screen for as long as somebody takes
     * to read it — long enough for a ruling to have gone out from a double tap on the
     * button behind it.
     */
    function send() {
        setConfirming(false);
        if (!ready || busy) return;

        onSettle({ guesses: review.guesses });
    }

    /** Append what a pad key produced to whoever's field is in focus. */
    function press(character: string) {
        if (focused === null) return;

        setTyped(current => {
            const held = current[focused] ?? '';
            // A guess nobody could read out is not a guess. The stop is here rather than
            // in `reviewGuesses`, which is about what a number means and not about how
            // wide the field it came from is.
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

    if (stage === 'reading') {
        return (
            <View style={styles.turn}>
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

                        {/* Who is playing for it, as faces rather than as a list of
                            names. The quizmaster is about to go round the table asking
                            each of them in turn, and this is the order to go in. */}
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
                            // Somewhere to type before the first row is tapped: the pad
                            // arriving with nothing in focus is a pad that does nothing.
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

    return (
        <View style={styles.screen}>
            <View style={styles.body}>
                {/* The recap stands where the strip did. Everything the strip was saying
                    has already been said out loud by this point in the turn, and the
                    question is the one thing the table will ask for again. */}
                <QuestionRecap
                    prompt={turn.question.prompt}
                    icon="arrow-left"
                    hint={t('pubquizr.play.closest.backToQuestion')}
                    onPress={() => setStage('reading')}
                />

                <BackstagePanel
                    answer={turn.unit === ''
                        ? String(turn.answer)
                        : t('pubquizr.play.closest.answer', { answer: turn.answer, unit: turn.unit })}
                    aliases={turn.explanation === '' ? [] : [turn.explanation]}
                    revealed={revealed}
                    onReveal={() => setRevealed(true)}
                    onHide={revealed ? () => setRevealed(false) : undefined}
                    compact
                />

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

                {/*
                 * The one scroller on the screen, and a direct child of the board rather
                 * than something nested inside a flexed card. A table of eight is seven
                 * rows, which is the one case that still does not fit; everything smaller
                 * simply sits there.
                 */}
                <ScrollView
                    style={styles.rows}
                    contentContainerStyle={styles.rowsInner}
                >
                    {turn.guessing.map(seat => {
                        const nearest = marked.includes(seat.seat);
                        const clashing = review.duplicates.includes(seat.seat);
                        const chosen = byHand && picked === seat.seat;
                        const holding = !byHand && focused === seat.seat;
                        const guess = review.guesses.find(entry => entry.seat === seat.seat);

                        return (
                            <Pressable
                                key={seat.seat}
                                onPress={byHand
                                    ? () => setPicked(seat.seat)
                                    : () => setFocused(seat.seat)}
                                disabled={busy}
                                accessibilityRole={byHand ? 'radio' : 'button'}
                                accessibilityState={byHand
                                    ? { checked: chosen }
                                    : { selected: holding }}
                                accessibilityLabel={byHand
                                    ? seat.name
                                    : t('pubquizr.play.closest.entry', { name: seat.name })}
                                style={[
                                    styles.row,
                                    nearest && styles.nearest,
                                    chosen && styles.nearest,
                                    // After the fill, so the row being typed into still
                                    // says so when it is also the one winning. It is the
                                    // only cursor this screen has.
                                    holding && styles.holding,
                                    clashing && styles.clashing
                                ]}
                            >
                                <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
                                    <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                                        {seat.initials}
                                    </AppText>
                                </View>

                                <View style={styles.who}>
                                    <AppText
                                        style={[styles.name, (nearest || chosen) && styles.onMint]}
                                        numberOfLines={1}
                                    >
                                        {seat.name}
                                    </AppText>

                                    {/* How far off, so nobody does the subtraction out
                                        loud with five people checking the arithmetic.
                                        Only ever after the reveal — before it, this line
                                        would be the answer told sideways. */}
                                    {revealed && guess !== undefined && (
                                        <View style={styles.gap}>
                                            {nearest && (
                                                <Feather name="award" size={11} color={Brand.ink} />
                                            )}

                                            <AppText
                                                style={[styles.gapText, nearest && styles.onMint]}
                                            >
                                                {nearest
                                                    ? t('pubquizr.play.closest.nearestOff', {
                                                        off: offBy(guess.value, turn.answer)
                                                    })
                                                    : t('pubquizr.play.closest.off', {
                                                        off: offBy(guess.value, turn.answer)
                                                    })}
                                            </AppText>
                                        </View>
                                    )}
                                </View>

                                {byHand ? (
                                    <Feather
                                        name={chosen ? 'check-circle' : 'circle'}
                                        size={20}
                                        color={chosen ? Brand.ink : theme.colors.textMuted}
                                    />
                                ) : (
                                    /*
                                     * Inert, and that is the point of it. The pad along
                                     * the bottom is what edits this, so the field takes
                                     * no focus and raises no keyboard — `pointerEvents`
                                     * off so the tap goes to the row instead, which is
                                     * the thing that moves the pad's attention here.
                                     */
                                    <View pointerEvents="none" style={styles.fieldWrap}>
                                        <TextInput
                                            value={typed[seat.seat] ?? ''}
                                            editable={false}
                                            showSoftInputOnFocus={false}
                                            placeholder={t('pubquizr.play.closest.placeholder')}
                                            placeholderTextColor={theme.colors.textFaint}
                                            style={[
                                                styles.field,
                                                nearest && styles.fieldNearest,
                                                holding && styles.fieldHolding
                                            ]}
                                        />

                                        {holding && <View style={styles.caret} />}
                                    </View>
                                )}
                            </Pressable>
                        )
                    })}
                </ScrollView>

                {problem !== null && (
                    <AppText style={styles.problem}>{t(problem)}</AppText>
                )}

                {error !== null && (
                    <InlineNotification
                        icon="alert-triangle"
                        color={theme.colors.blush}
                        message={t(error)}
                    />
                )}

                <View style={styles.footer}>
                    <ActionButton
                        size="large"
                        icon="award"
                        // Named once there is a name to say. Before the reveal it stays
                        // the round's rule, for the same reason the rows stay unmarked:
                        // "Award 2 to Sanne" on an unrevealed board tells the quizmaster
                        // who was nearest, which is most of the answer.
                        text={byHand
                            ? t('pubquizr.play.closest.award')
                            : winner !== null
                                ? t('pubquizr.play.closest.awardTo', {
                                    worth: turn.worth,
                                    name: winner.name
                                })
                                : t('pubquizr.play.closest.settle', { worth: turn.worth })}
                        disabled={!ready || busy}
                        onPress={settle}
                    />

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
                </View>
            </View>

            {/* By hand there is nothing to type, so there is no pad — and the rows get
                the height back to be tapped in. */}
            {!byHand && (
                <NumberPad
                    onKey={press}
                    onBackspace={backspace}
                    disabled={busy || focused === null}
                    style={styles.pad}
                />
            )}

            {/*
              * Dismissable, unlike the panels that stand in front of something dangerous:
              * backing out of this one lands on the form with everything still typed in,
              * which is the outcome it is recommending anyway.
              */}
            <PopupModal
                visible={confirming}
                title={t('pubquizr.play.closest.missingTitle')}
                message={blank.length === 1
                    ? t('pubquizr.play.closest.missingOne', { names: blank[0].name })
                    : t('pubquizr.play.closest.missingMany', {
                        names: blank.map(seat => seat.name).join(', ')
                    })}
                onRequestClose={() => setConfirming(false)}
            >
                <TextButton
                    text={t('pubquizr.play.closest.missingBack')}
                    variant="primary"
                    fullWidth
                    onPress={() => setConfirming(false)}
                />

                <TextButton
                    text={t('pubquizr.play.closest.missingAnyway')}
                    variant="muted"
                    fullWidth
                    disabled={busy}
                    onPress={send}
                />
            </PopupModal>
        </View>
    )
}

/**
 * How far a guess landed from the answer, as something to put in a sentence.
 *
 * Rounded to two places and stripped of trailing zeros, because the arithmetic is
 * floating point and "6.000000000000001 off" is not a thing anybody says.
 */
function offBy(value: number, answer: number): string {
    return String(Math.round(Math.abs(value - answer) * 100) / 100);
}

const useStyles = createThemedStyles(theme => ({
    // The reading screen, which is a board like any other.
    turn: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    // The collecting screen, which is a board with a pad bolted to the bottom of it —
    // so the margin lives out here and the column inside carries only the gap.
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

    /* The reading screen ------------------------------------------------------- */

    // Mint, because it is the same "this is what it pays" the badge on the strip wears
    // in every other round. This round has no per-seat badge to put it on.
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

    // Mint: this one is not a gate in front of anything irreversible, it is the turn
    // carrying on, and mint is what this round pays in.
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
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hard)
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

    /* The collecting screen ---------------------------------------------------- */

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

    // 60 points and a 36-point swatch, up from 46 and 30. These rows are read across a
    // table by somebody checking whether their number went in right, and tapped by a
    // thumb belonging to a person who is also talking.
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

    // Where the pad is typing. The scheme's own accent plus the halo every focused
    // control in this app wears, because that is exactly what this is — the row with
    // the cursor in it, on a screen whose cursor is not where the finger is.
    holding: {
        borderColor: theme.colors.focus,
        boxShadow: `0 0 0 4px ${theme.colors.focusRing}`
    },

    // Mint in both schemes, the same "this one" the Correct button wears.
    nearest: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    clashing: {
        borderColor: theme.colors.destructive
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

    gap: {
        marginTop: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },

    gapText: {
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    fieldWrap: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center'
    },

    // 104 by 46, up from 96 by 38, and the number itself from 15 to 21. It is the one
    // thing on the row that has to be checked from the far side of a table, and it was
    // the smallest.
    //
    // A raw TextInput is not an AppText, so the family has to be named by hand — the
    // same thing `TextField` does for the same reason.
    field: {
        width: 104,
        height: 46,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundInput,
        textAlign: 'right',
        fontSize: 21,
        letterSpacing: -0.4,
        fontFamily: fontFamilyForWeight(900),
        color: theme.colors.text
    },

    fieldHolding: {
        borderColor: theme.colors.focus,
        backgroundColor: theme.colors.backgroundFocus
    },

    fieldNearest: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.backgroundSecondary,
        color: Brand.ink
    },

    // Drawn rather than real: the field is not editable, so it has no cursor of its own,
    // and the pad needs somewhere visible to be pointing.
    caret: {
        position: 'absolute',
        right: 8,
        width: 2,
        height: 22,
        backgroundColor: theme.colors.focus
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
        gap: 8
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

    // Out to the glass on three sides. `flexShrink` on the pad itself is what lets a
    // table of eight take the height back off it rather than off the rows.
    pad: {
        marginTop: 12,
        marginHorizontal: -PAGE_PADDING,
        marginBottom: -PAGE_PADDING
    }
}))
