import { LOBBY_CODE_LENGTH } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Brand, Spacing, fontFamilyForWeight } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { RelativePathString, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, TextInput, View } from "react-native";

/** Half a blink. The caret is on for this long, then off for this long. */
const BLINK_MS = 550;

const SLOTS = Array.from({ length: LOBBY_CODE_LENGTH }, (_, index) => index);

/**
 * Enter a room code and join someone else's game.
 *
 * The code is drawn as one box per character, but it is typed into a single `TextInput`
 * laid over the whole row at zero opacity. One field rather than six is what makes the
 * platform's own behaviour work — paste drops a whole code in, backspace walks back
 * through it, autofill from a message can fill it — none of which survives being split
 * across six inputs that hand focus to each other.
 */
export default function RoomCodeCard() {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();
    const field = useRef<TextInput>(null);

    const [code, setCode] = useState('');
    const [focused, setFocused] = useState(false);

    const complete = code.length === LOBBY_CODE_LENGTH;

    // Where the next character lands. Past the end once the code is full, so no slot is
    // shown as waiting when none is.
    const cursor = focused ? code.length : -1;

    function join() {
        if (!complete) return;

        router.push(ROUTES.leagueOfLettersRoom(code) as RelativePathString);
    }

    return (
        <View style={styles.card}>
            <AppText style={styles.label}>Of join een kamer</AppText>

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
                    onChangeText={text => setCode(text.toUpperCase().replace(/\s/g, ''))}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onSubmitEditing={join}
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

            <Pressable
                onPress={join}
                disabled={!complete}
                accessibilityRole='button'
                accessibilityState={{ disabled: !complete }}
                style={[styles.join, !complete && styles.joinDisabled]}
            >
                <AppText style={styles.joinText}>Join kamer</AppText>

                <Feather
                    name='arrow-right'
                    size={17}
                    color={theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent}
                />
            </Pressable>
        </View>
    )
}

interface SlotProps {
    character: string | undefined,
    /** Whether this is the slot the next character lands in. */
    active: boolean
}

/** One character of the code: filled, waiting with a caret, or an empty dashed box. */
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
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    slots: {
        marginTop: Spacing.three - 4,
        flexDirection: 'row',
        gap: 7,
        justifyContent: 'center'    
    },
    slot: {
        flex: 1,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 13,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        maxWidth: 60
    },
    slotFilled: {
        borderStyle: 'solid',
        borderColor: theme.colors.borderStrong,
        // A slot that has been answered sinks back to the page in light and lifts a step
        // off it in dark — either way it stops competing with the one still being typed.
        backgroundColor: theme.scheme === 'dark'
            ? theme.colors.backgroundElement
            : theme.colors.background
    },
    slotActive: {
        borderStyle: 'solid',
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
        height: 26,
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
    join: {
        marginTop: Spacing.three - 4,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        // The one filled button on the page, so it takes the scheme's loudest note:
        // ink on paper, lemon on ink.
        borderColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.text,
        backgroundColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.text,
        boxShadow: theme.scheme === 'dark'
            ? '0 16px 26px -16px rgba(255, 229, 56, 0.6)'
            : '3px 3px 0 0 rgba(15, 13, 18, 0.25), 0 16px 26px -16px rgba(15, 13, 18, 0.8)'
    },
    // The same half-strength every other blocked control in the app wears.
    joinDisabled: {
        opacity: 0.5
    },
    joinText: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: 0.3,
        color: theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent
    }
}))
