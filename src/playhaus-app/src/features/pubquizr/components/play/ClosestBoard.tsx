import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import ActionButton from "@/components/ui/ActionButton";
import AnswerReveal from "@/components/ui/AnswerReveal";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { Brand, fontFamilyForWeight, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { reviewGuesses, type ClosestTurn } from "@/features/pubquizr/round-three";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
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

    return (
        <View style={styles.screen}>
            <View style={styles.body}>
                {strip}

                <Label label={turn.question.prompt} />

                {/* Hidden at the smallest table the game allows. */}
                {!turn.quizmasterGuesses && (
                    <AnswerReveal
                        answer={turn.unit === ''
                            ? String(turn.answer)
                            : t('pubquizr.play.closest.answer', { answer: turn.answer, unit: turn.unit })}
                        aliases={turn.explanation === '' ? [] : [turn.explanation]}
                        compact
                    />
                )}

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

                {/* The one scroller on the screen, and a direct child of the board rather than something nested inside a flexed card. */}
                <ScrollView
                    style={styles.rows}
                    contentContainerStyle={styles.rowsInner}
                >
                    {turn.guessing.map(seat => {
                        const clashing = review.duplicates.includes(seat.seat);
                        const chosen = byHand && picked === seat.seat;
                        const holding = !byHand && focused === seat.seat;

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
                                    // Only ever a row somebody has tapped.
                                    chosen && styles.chosen,
                                    // After the fill, so the row being typed into still says so.
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
                                    {/* How far off used to be said here too, under the name. */}
                                    <AppText
                                        style={[styles.name, chosen && styles.onMint]}
                                        numberOfLines={1}
                                    >
                                        {seat.name}
                                    </AppText>
                                </View>

                                {byHand ? (
                                    <Feather
                                        name={chosen ? 'check-circle' : 'circle'}
                                        size={20}
                                        color={chosen ? Brand.ink : theme.colors.textMuted}
                                    />
                                ) : (
                                    // Inert, and that is the point of it.
                                    <View pointerEvents="none" style={styles.fieldWrap}>
                                        <TextInput
                                            value={typed[seat.seat] ?? ''}
                                            editable={false}
                                            showSoftInputOnFocus={false}
                                            placeholder={t('pubquizr.play.closest.placeholder')}
                                            placeholderTextColor={theme.colors.textFaint}
                                            style={[styles.field, holding && styles.fieldHolding]}
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
                        // Never a name.
                        text={byHand
                            ? t('pubquizr.play.closest.award')
                            : t('pubquizr.play.validate')}
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

            {/* By hand there is nothing to type, so there is no pad — and the rows get the height back to be tapped in. */}
            {!byHand && (
                <NumberPad
                    onKey={press}
                    onBackspace={backspace}
                    disabled={busy || focused === null}
                    style={styles.pad}
                />
            )}

            {/* Dismissable, unlike the panels that stand in front of something dangerous. */}
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

    /* The reading screen ------------------------------------------------------- */

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

    // Where the pad is typing.
    holding: {
        borderColor: theme.colors.focus,
        boxShadow: `0 0 0 4px ${theme.colors.focusRing}`
    },

    // Mint in both schemes, the same "this one" the Correct button wears.
    chosen: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hardSmall
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

    fieldWrap: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center'
    },

    // 104 by 46, up from 96 by 38, and the number itself from 15 to 21.
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

    // Drawn rather than real: the field is not editable.
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

    // Out to the glass on three sides.
    pad: {
        marginTop: 12,
        marginHorizontal: -PAGE_PADDING,
        marginBottom: -PAGE_PADDING
    }
}))
