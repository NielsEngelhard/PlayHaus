import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import ActionButton from "@/components/ui/ActionButton";
import AnswerReveal from "@/components/ui/AnswerReveal";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { Brand, fontFamilyForWeight, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import NumberPad from "@/features/pubquizr/components/play/NumberPad";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import type { SeatGuess } from "@/features/pubquizr/pubquizr-sessions";
import { reviewGuesses, type ClosestTurn } from "@/features/pubquizr/round-three";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

// The gutters `ControlFrame` puts on, which the pad has to undo to reach the glass.
const PAGE_PADDING = Spacing.four;

// As long a number as one field will hold at 21 points.
const MAX_DIGITS = 12;

interface Props {
    /** The settle is already in the air. */
    busy: boolean
    error: TranslationKey | null
    // Only what was typed in here: everything else is already on the server, waiting to be scored.
    onSettle: (byHand: SeatGuess[]) => void
    /** Which round this is, for the strip's pips. */
    round: number
    /** Whose numbers the server already has for this question. Never the numbers themselves. */
    seatsIn: number[]
    turn: ClosestTurn
}

// Round 3 on the reader's phone: who is in, who is not, and the button that closes the question.
export default function ClosestSettleControl({ busy, error, onSettle, round, seatsIn, turn }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    /** Numbers typed in here, for a phone that could not send its own. */
    const [typed, setTyped] = useState<Record<number, string>>({});
    /** Whose field the pad is typing into. */
    const [focused, setFocused] = useState<number | null>(null);
    /** Standing in front of a settle that would leave somebody out. */
    const [confirming, setConfirming] = useState(false);

    // Reset during render, the same way the single device board resets its ritual.
    const [settledId, setSettledId] = useState<string | null>(null);
    if (settledId !== turn.dealt.id) {
        setSettledId(turn.dealt.id);
        setTyped({});
        setFocused(null);
        setConfirming(false);
    }

    // Blank rows are dropped rather than complained about, so this reads only what was actually typed in here.
    const review = reviewGuesses(
        turn.guessing.map(seat => ({ seat: seat.seat, text: typed[seat.seat] ?? '' })),
        turn.answer
    );

    // A clash between two typed rows is catchable here; a clash with a number a phone sent is not, and comes back as a refusal.
    const problem: TranslationKey | null = review.duplicates.length > 0
        ? 'pubquizr.play.closest.duplicate'
        : review.unreadable.length > 0
            ? 'pubquizr.play.closest.unreadable'
            : null;

    /** Everybody with no number at all, and how many are not. */
    const blank = turn.guessing.filter(seat => (typed[seat.seat] ?? '').trim() === ''
        && !seatsIn.includes(seat.seat));
    const filled = turn.guessing.length - blank.length;

    function settle() {
        if (problem !== null || busy) return;

        if (blank.length > 0) {
            setConfirming(true);
            return;
        }

        send();
    }

    // The settle itself, past whatever stood in front of it.
    function send() {
        setConfirming(false);
        if (problem !== null || busy) return;

        onSettle(review.guesses);
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

    return (
        <View style={styles.screen}>
            <View style={styles.body}>
                {/* Drawn here rather than by `ControlFrame`, because round 3 asks the whole table and so names nobody. */}
                <TurnStrip
                    quizmaster={turn.quizmaster}
                    answering={null}
                    lead={t('pubquizr.play.leadClosest', { name: turn.quizmaster.name })}
                    run={0}
                    round={round}
                    number={turn.number}
                    total={turn.total}
                    worth={turn.worth}
                />

                <Label label={turn.question.prompt} />

                {/* Hidden at the smallest table the game allows, where the reader guesses too. */}
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
                        const overridden = (typed[seat.seat] ?? '') !== '';
                        const holding = focused === seat.seat;
                        const clashing = review.duplicates.includes(seat.seat);
                        // A number the server already has needs no field, until somebody types over it.
                        const field = holding || overridden || !seatsIn.includes(seat.seat);

                        return (
                            <Pressable
                                key={seat.seat}
                                onPress={() => setFocused(seat.seat)}
                                disabled={busy}
                                accessibilityRole="button"
                                accessibilityState={{ selected: holding }}
                                accessibilityLabel={t('pubquizr.play.closest.entry', { name: seat.name })}
                                style={[
                                    styles.row,
                                    !field && styles.chosen,
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
                                    <AppText
                                        style={[styles.name, !field && styles.onMint]}
                                        numberOfLines={1}
                                    >
                                        {seat.name}
                                    </AppText>
                                </View>

                                {field ? (
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
                                ) : (
                                    <Feather name="check-circle" size={20} color={Brand.ink} />
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
                        text={t('pubquizr.play.validate')}
                        disabled={problem !== null || busy}
                        onPress={settle}
                    />
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
    // A board with a pad bolted to the bottom of it.
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

    // Mint in both schemes: a number that is in and needs nothing from this phone.
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

    // Out to the glass on three sides.
    pad: {
        marginTop: 12,
        marginHorizontal: -PAGE_PADDING,
        marginBottom: -PAGE_PADDING
    }
}))
