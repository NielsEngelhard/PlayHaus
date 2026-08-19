import { LOBBY_CODE_LENGTH } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Spacing, fontFamilyForWeight } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { RelativePathString, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, TextInput, View } from "react-native";

/** Half a blink. The caret is on for this long, then off for this long. */
const BLINK_MS = 550;

const SLOTS = Array.from({ length: LOBBY_CODE_LENGTH }, (_, index) => index);

/**
 * Everything a code is allowed to be. Anything else is dropped as it arrives, which is
 * what lets a pasted "code: ab-cd" become `ABCD` rather than being refused.
 */
function sanitize(text: string): string {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LOBBY_CODE_LENGTH);
}

/**
 * Enter a room code and join someone else's game.
 *
 * The code is drawn as one box per character, but it is typed into a single `TextInput`
 * laid over the whole row at zero opacity. One field rather than four is what makes the
 * platform's own behaviour work — paste drops a whole code in, backspace walks back
 * through it, autofill from a message can fill it — none of which survives being split
 * across four inputs that hand focus to each other.
 *
 * There is no submit button. A code is a fixed four characters, so the last one someone
 * types is unambiguously the end of it, and a button underneath would only be a second way
 * to say what the field already knows. The line under the row admits that it acts on its
 * own, because a form that does had better say so before it does it.
 */
export default function RoomCodeCard() {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();
    const field = useRef<TextInput>(null);

    const [code, setCode] = useState('');
    const [focused, setFocused] = useState(false);

    /**
     * Whether this card has already sent someone off with the code it holds.
     *
     * This screen stays mounted underneath the room, so coming back from a code that did
     * not exist lands here with the field still full. Without this the completed code
     * would fire a second time on the way back and bounce the user straight out again.
     */
    const sent = useRef(false);

    // Where the next character lands. Past the end once the code is full, so no slot is
    // shown as waiting when none is.
    const cursor = focused ? code.length : -1;

    function join(value: string) {
        if (value.length !== LOBBY_CODE_LENGTH || sent.current) return;

        sent.current = true;
        // The room draws its own chrome, and an open keyboard would sit on top of it.
        field.current?.blur();

        router.push(ROUTES.leagueOfLettersRoom(value) as RelativePathString);
    }

    function change(text: string) {
        const next = sanitize(text);

        // Editing back down to an incomplete code is the signal that this is a fresh
        // attempt, so the next completion is allowed to travel.
        if (next.length < LOBBY_CODE_LENGTH) sent.current = false;

        setCode(next);
        join(next);
    }

    async function paste() {
        try {
            change(await Clipboard.getStringAsync());
        } catch {
            // Web can refuse the read outright, and a clipboard that says no is not worth
            // a message — the field is still sitting there to type into.
            field.current?.focus();
        }
    }

    return (
        <View style={styles.card}>
            <View style={styles.head}>
                <AppText style={styles.label}>Of join een kamer</AppText>

                <Pressable
                    style={styles.paste}
                    onPress={paste}
                    accessibilityRole='button'
                    accessibilityLabel='Code plakken'
                >
                    <Feather name='clipboard' size={13} color={theme.colors.focus} />

                    <AppText style={styles.pasteText}>Plakken</AppText>
                </Pressable>
            </View>

            <Pressable
                style={styles.slots}
                onPress={() => field.current?.focus()}
                accessibilityRole='none'
            >
                {SLOTS.map(index => (
                    <Slot
                        key={index}
                        character={code[index]}
                        active={index === cursor}
                    />
                ))}

                {/* Invisible, and on top so it takes the taps. Kept at the row's own size
                    rather than shrunk to nothing: a zero-height field is one some
                    browsers refuse to focus, and a small font size makes iOS Safari zoom
                    the page on focus. */}
                <TextInput
                    ref={field}
                    value={code}
                    // Codes read as one block of capitals, so the field owns that rather
                    // than trusting every keyboard to honour `autoCapitalize`.
                    onChangeText={change}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onSubmitEditing={() => join(code)}
                    maxLength={LOBBY_CODE_LENGTH}
                    autoCapitalize='characters'
                    autoCorrect={false}
                    returnKeyType='go'
                    accessibilityLabel='Kamercode'
                    // `caretHidden` because the boxes draw their own, and the real one
                    // would be sitting at the far left of an invisible field.
                    caretHidden
                    style={styles.input}
                />
            </Pressable>

            <AppText style={styles.hint}>Vier tekens — je gaat er automatisch in</AppText>
        </View>
    )
}

interface SlotProps {
    character: string | undefined,
    /** Whether this is the slot the next character lands in. */
    active: boolean
}

/** One character of the code: filled, waiting with a caret, or an empty box. */
function Slot({ character, active }: SlotProps) {
    const styles = useStyles();
    const filled = character !== undefined;

    return (
        <View style={[styles.slot, filled && styles.slotFilled, active && styles.slotActive]}>
            {filled
                ? <AppText style={styles.slotText}>{character}</AppText>
                : active && <Caret />}
        </View>
    )
}

/** The blinking bar in the slot being typed into. */
function Caret() {
    const styles = useStyles();
    const [blink] = useState(() => new Animated.Value(1));

    useEffect(() => {
        // `Easing.step0` snaps rather than fades: a caret that eases in and out reads as
        // a pulsing decoration instead of a cursor.
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(BLINK_MS),
                Animated.timing(blink, {
                    toValue: 0,
                    duration: 1,
                    easing: Easing.step0,
                    useNativeDriver: true
                }),
                Animated.delay(BLINK_MS),
                Animated.timing(blink, {
                    toValue: 1,
                    duration: 1,
                    easing: Easing.step0,
                    useNativeDriver: true
                })
            ])
        );

        loop.start();

        return () => loop.stop();
    }, [blink]);

    return <Animated.View style={[styles.caret, { opacity: blink }]} />;
}

const useStyles = createThemedStyles(theme => ({
    card: {
        padding: Spacing.three,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border))
    },
    head: {
        flexDirection: 'row',
        // The label is uppercase micro-type and the paste chip is not, so it is their
        // baselines that should agree rather than their boxes.
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    paste: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        gap: 5
    },
    pasteText: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.focus
    },
    slots: {
        marginTop: Spacing.three - 4,
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center'
    },
    slot: {
        flex: 1,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 13,
        borderWidth: theme.borderWidth,
        // A quiet solid line rather than a dashed one. Four boxes is few enough to read as
        // a code at a glance, and dashes at this size turned the row into a dotted band.
        borderColor: theme.colors.boardEmptyBorder,
        backgroundColor: theme.colors.background,
        // Four slots in a 600pt column would otherwise stretch into letterboxes.
        maxWidth: 66
    },
    slotFilled: {
        // A slot that has been answered climbs back to the card's own surface and takes a
        // full-strength line, so the code reads as one solid block once it is all in.
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundFocus
    },
    slotActive: {
        borderColor: theme.scheme === 'dark' ? theme.colors.focus : theme.colors.border,
        backgroundColor: theme.colors.backgroundFocus,
        // A halo rather than a thicker line, so the row doesn't shift as focus moves.
        boxShadow: `0 0 0 3px ${theme.colors.focusRing}`
    },
    slotText: {
        fontSize: 24,
        fontWeight: 900,
        color: theme.colors.text
    },
    caret: {
        width: 2,
        height: 22,
        backgroundColor: theme.colors.focus
    },
    input: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        opacity: 0,
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(900),
        fontSize: 24,
        textAlign: 'center',
        color: theme.colors.text
    },
    hint: {
        marginTop: 11,
        fontSize: 12,
        fontWeight: 500,
        color: theme.colors.textMuted
    }
}))
