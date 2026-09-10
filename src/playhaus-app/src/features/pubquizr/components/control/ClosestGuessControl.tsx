import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { Brand, fontFamilyForWeight, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import NumberPad from "@/features/pubquizr/components/play/NumberPad";
import ScriptCard from "@/features/pubquizr/components/play/ScriptCard";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import type { ClosestTurn } from "@/features/pubquizr/round-three";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { TextInput, View } from "react-native";

// The gutters `ControlFrame` puts on, which the pad has to undo to reach the glass.
const PAGE_PADDING = Spacing.four;

// As long a number as one field will hold at this size.
const MAX_DIGITS = 12;

interface Props {
    /** A number is already on its way to the server. */
    busy: boolean
    error: TranslationKey | null
    // Says one number, which the server keeps to itself until the question is closed.
    onGuess: (value: number) => void
    /** Which round this is, for the strip's pips. */
    round: number
    /** Whether the server already has this phone's number for this question. */
    sent: boolean
    turn: ClosestTurn
}

// Round 3 on one guessing phone. It never draws `turn.answer`: the number the table is hunting is the quizmaster's alone.
export default function ClosestGuessControl({ busy, error, onGuess, round, sent, turn }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    const [entry, setEntry] = useState<{ questionId: string | null, text: string }>({
        questionId: null,
        text: ''
    });
    /** Typing over a number that is already in. */
    const [editing, setEditing] = useState(false);

    // Reset during render, like every other controller here. It sends nothing, because a request from render is a side effect.
    if (entry.questionId !== turn.dealt.id) {
        setEntry({ questionId: turn.dealt.id, text: '' });
        setEditing(false);
    }

    const text = entry.questionId === turn.dealt.id ? entry.text : '';
    // A comma is what half the table types, and it means the same thing.
    const value = Number(text.replace(',', '.'));
    const ready = text.trim() !== '' && Number.isFinite(value);
    // Once the number is in, the pad goes away until somebody asks for it back.
    const holding = sent && !editing;

    function press(character: string) {
        if (busy) return;

        setEntry(current => current.text.length >= MAX_DIGITS
            ? current
            : { ...current, text: current.text + character });
    }

    function backspace() {
        if (busy) return;

        setEntry(current => ({ ...current, text: current.text.slice(0, -1) }));
    }

    function send() {
        if (!ready || busy) return;

        setEditing(false);
        onGuess(value);
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

                <ScriptCard
                    prompt={turn.question.prompt}
                    cue={t('pubquizr.control.yourGuess')}
                    fills={false}
                    size={21}
                />

                {error !== null && (
                    <InlineNotification
                        icon="alert-triangle"
                        color={theme.colors.blush}
                        message={t(error)}
                    />
                )}

                <View style={styles.middle}>
                    {holding ? (
                        <View style={styles.in}>
                            <Feather name="check-circle" size={22} color={Brand.ink} />

                            <AppText style={styles.inLabel}>
                                {t('pubquizr.control.guessSent')}
                            </AppText>

                            <AppText style={styles.inValue}>{text}</AppText>
                        </View>
                    ) : (
                        // Inert, and that is the point of it: the pad below is the only way into it.
                        <View pointerEvents="none" style={styles.fieldWrap}>
                            <TextInput
                                value={text}
                                editable={false}
                                showSoftInputOnFocus={false}
                                placeholder={t('pubquizr.play.closest.placeholder')}
                                placeholderTextColor={theme.colors.textFaint}
                                style={styles.field}
                            />

                            <View style={styles.caret} />
                        </View>
                    )}
                </View>

                <View style={styles.footer}>
                    {holding ? (
                        <TextButton
                            text={t('pubquizr.control.changeGuess')}
                            variant="primary"
                            fullWidth
                            disabled={busy}
                            onPress={() => setEditing(true)}
                        />
                    ) : (
                        <ActionButton
                            size="large"
                            icon="send"
                            text={t('pubquizr.control.submitGuess')}
                            disabled={!ready || busy}
                            onPress={send}
                        />
                    )}

                    <TextHint text={t('pubquizr.control.theScreenHasIt')} />
                </View>
            </View>

            {!holding && (
                <NumberPad
                    onKey={press}
                    onBackspace={backspace}
                    disabled={busy}
                    style={styles.pad}
                />
            )}
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

    // The one part that grows, so the field sits in the middle of whatever room is left.
    middle: {
        flex: 1,
        minHeight: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },

    fieldWrap: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    // The number is the whole screen here, so it is drawn at the size somebody reads out.
    field: {
        width: 220,
        height: 76,
        paddingHorizontal: 18,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundInput,
        textAlign: 'right',
        fontSize: 40,
        letterSpacing: -1,
        fontFamily: fontFamilyForWeight(900),
        color: theme.colors.text
    },

    // Drawn rather than real: the field is not editable.
    caret: {
        position: 'absolute',
        right: 14,
        width: 3,
        height: 40,
        backgroundColor: theme.colors.focus
    },

    // Mint in both schemes: the same "that is in" the rest of the game uses.
    in: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 22,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hard
    },

    inLabel: {
        fontSize: 13,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: Brand.ink
    },

    inValue: {
        fontSize: 30,
        fontWeight: 900,
        letterSpacing: -1,
        color: Brand.ink
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
