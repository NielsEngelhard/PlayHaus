import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Brand, fontFamilyForWeight } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { reviewGuesses, type ClosestTurn } from "@/features/pubquizr/round-three";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import BackstagePanel from "./BackstagePanel";
import ScriptCard from "./ScriptCard";

interface Props {
    turn: ClosestTurn
    /** Everybody at the table, for the score strip under the question. */
    seats: Seat[]
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
 * The answer stays behind the covered panel until it is asked for, exactly as in every
 * other round: this screen is the one thing that can spoil the question, and the numbers
 * being typed in are being said out loud as they are typed.
 */
export default function ClosestBoard({ turn, seats, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [revealed, setRevealed] = useState(false);
    const [typed, setTyped] = useState<Record<number, string>>({});
    /** Dropped out of typing and picking the winner by hand instead. */
    const [byHand, setByHand] = useState(false);
    const [picked, setPicked] = useState<number | null>(null);

    /*
     * Reset during render, the same way the hot seat board resets its ritual: a new
     * question has to arrive with an empty form and a covered answer in the same commit
     * that brings it, or the board paints once with the last question's numbers under
     * the new question's prompt.
     */
    const [settledId, setSettledId] = useState<string | null>(null);
    if (settledId !== turn.dealt.id) {
        setSettledId(turn.dealt.id);
        setRevealed(false);
        setTyped({});
        setByHand(false);
        setPicked(null);
    }

    const review = reviewGuesses(
        turn.guessing.map(seat => ({ seat: seat.seat, text: typed[seat.seat] ?? '' })),
        turn.answer
    );

    // Only once the answer is on screen: marking a row as nearest before the quizmaster
    // has seen the number is the app telling them the answer sideways.
    const marked = revealed ? review.winners : [];

    const problem: TranslationKey | null = review.duplicates.length > 0
        ? 'pubquizr.play.closest.duplicate'
        : review.unreadable.length > 0
            ? 'pubquizr.play.closest.unreadable'
            : null;

    const ready = byHand
        ? picked !== null
        : review.guesses.length > 0 && problem === null;

    function settle() {
        if (!ready || busy) return;

        if (byHand) {
            if (picked === null) return;
            onSettle({ winningSeats: [picked] });
            return;
        }

        onSettle({ guesses: review.guesses });
    }

    return (
        <View style={styles.turn}>
            <ScriptCard prompt={turn.question.prompt} seats={seats} />

            <BackstagePanel
                answer={turn.unit === ''
                    ? String(turn.answer)
                    : t('pubquizr.play.closest.answer', { answer: turn.answer, unit: turn.unit })}
                aliases={turn.explanation === '' ? [] : [turn.explanation]}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
            />

            <ScrollView
                style={styles.rows}
                contentContainerStyle={styles.rowsInner}
                keyboardShouldPersistTaps="handled"
            >
                {turn.guessing.map(seat => {
                    const nearest = marked.includes(seat.seat);
                    const clashing = review.duplicates.includes(seat.seat);
                    const chosen = byHand && picked === seat.seat;

                    return (
                        <Pressable
                            key={seat.seat}
                            onPress={byHand ? () => setPicked(seat.seat) : undefined}
                            disabled={!byHand || busy}
                            accessibilityRole={byHand ? 'radio' : undefined}
                            accessibilityState={byHand ? { checked: chosen } : undefined}
                            style={[
                                styles.row,
                                nearest && styles.nearest,
                                chosen && styles.nearest,
                                clashing && styles.clashing
                            ]}
                        >
                            <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
                                <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                                    {seat.initials}
                                </AppText>
                            </View>

                            <AppText
                                style={[styles.name, (nearest || chosen) && styles.onMint]}
                                numberOfLines={1}
                            >
                                {seat.name}
                            </AppText>

                            {byHand ? (
                                <Feather
                                    name={chosen ? 'check-circle' : 'circle'}
                                    size={20}
                                    color={chosen ? Brand.ink : theme.colors.textMuted}
                                />
                            ) : (
                                <TextInput
                                    value={typed[seat.seat] ?? ''}
                                    onChangeText={value => setTyped(current => ({
                                        ...current,
                                        [seat.seat]: value
                                    }))}
                                    placeholder={t('pubquizr.play.closest.placeholder')}
                                    placeholderTextColor={theme.colors.textSecondary}
                                    // `numbers-and-punctuation` rather than a bare number
                                    // pad: a guess can be negative and can have a decimal
                                    // point, and a pad without them is a field somebody
                                    // cannot answer "minus two and a half" in.
                                    keyboardType="numbers-and-punctuation"
                                    editable={!busy}
                                    accessibilityLabel={t('pubquizr.play.closest.entry', { name: seat.name })}
                                    style={[styles.input, nearest && styles.inputNearest]}
                                />
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

                <ActionButton
                    size="large"
                    icon="award"
                    text={byHand
                        ? t('pubquizr.play.closest.award')
                        : t('pubquizr.play.closest.settle', { worth: turn.worth })}
                    disabled={!ready || busy}
                    onPress={settle}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    // The rows are the part that gives: a table of eight is seven of them, and the
    // question above and the button below both have to stay where they are.
    rows: {
        flex: 1,
        minHeight: 0
    },

    rowsInner: {
        gap: 7,
        paddingBottom: 2
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        paddingRight: 10,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // Mint in both schemes, the same "this one" the Correct button wears.
    nearest: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    clashing: {
        borderColor: theme.colors.destructive
    },

    avatar: {
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 11,
        fontWeight: 900
    },

    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    // A raw TextInput is not an AppText, so the family has to be named by hand — the
    // same thing `TextField` does for the same reason.
    input: {
        width: 96,
        height: 38,
        flexShrink: 0,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundInput,
        textAlign: 'right',
        fontSize: 15,
        fontFamily: fontFamilyForWeight(800),
        color: theme.colors.text
    },

    inputNearest: {
        borderColor: Brand.ink,
        color: Brand.ink
    },

    onMint: {
        color: Brand.ink
    },

    problem: {
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.destructiveText
    },

    footer: {
        flexShrink: 0,
        gap: 10
    },

    switch: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 8
    },

    switchText: {
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    }
}))
