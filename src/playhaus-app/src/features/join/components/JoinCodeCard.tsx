import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { gameForJoinCode } from "@/constants/games";
import { Brand, fontFamilyForWeight, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { JOIN_CODE_LENGTH, resolveJoinCode, sanitize } from "@/features/join/join-code";
import { codeFromLink } from "@/features/join/join-link";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { RelativePathString, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, TextInput, View } from "react-native";

/** Half a blink. The caret is on for this long, then off for this long. */
const BLINK_MS = 550;

const SLOTS = Array.from({ length: JOIN_CODE_LENGTH }, (_, index) => index);

// How big a slot may get, and the least it may keep.
const MIN_SLOT = 30;
const MAX_SLOT = 60;

const SLOT_GAP = Spacing.two;

// A slot is a little taller than it is wide — the proportion of a key rather than a square.
const SLOT_ASPECT = 0.86;

// Type size is the one thing that cannot follow the box, so it follows the code length instead.
const SLOT_FONT = JOIN_CODE_LENGTH > 4 ? 21 : 26;

// Enter a join code and join someone else's game.
export default function JoinCodeCard() {
    const styles = useStyles();
    const t = useT();

    const router = useRouter();
    const field = useRef<TextInput>(null);

    const [code, setCode] = useState('');
    const [focused, setFocused] = useState(false);

    // What to say about a code that went nowhere, or null when there is nothing to say.
    const [rejected, setRejected] = useState(false);

    // Whether this card has already sent someone off with the code it holds.
    const sent = useRef(false);

    // Where the next character lands.
    const cursor = focused ? code.length : -1;

    function join(value: string) {
        if (sent.current) return;

        const target = resolveJoinCode(value);

        // Still being typed.
        if (target.kind === 'incomplete') return;

        if (target.kind === 'rejected') {
            setRejected(true);
            return;
        }

        sent.current = true;
        setRejected(false);
        // The room draws its own chrome, and an open keyboard would sit on top of it.
        field.current?.blur();

        router.push(target.href as RelativePathString);
    }

    function change(text: string) {
        const next = sanitize(text);

        // Editing back down to an incomplete code is the signal that this is a fresh attempt, so the next completion is allowed to travel.
        if (next.length < JOIN_CODE_LENGTH) {
            sent.current = false;
            setRejected(false);
        }

        setCode(next);
        join(next);
    }

    // A whole code, arriving at once: lifted out of a pasted link.
    function acceptCode(value: string) {
        sent.current = false;
        setRejected(false);

        setCode(value);
        join(value);
    }

    async function paste() {
        try {
            const clipboard = await Clipboard.getStringAsync();

            // A whole join link is the likeliest thing on the clipboard now that the host's screen offers one to share.
            const linked = codeFromLink(clipboard);

            if (linked !== null) {
                acceptCode(linked);
                return;
            }

            change(clipboard);
        } catch {
            // Web can refuse the read outright, and a clipboard that says no is not worth a message.
            field.current?.focus();
        }
    }

    const pasteChip = (
        <PopPressable
            style={styles.paste}
            onPress={() => void paste()}
            accessibilityRole='button'
            accessibilityLabel={t('join.pasteLabel')}
        >
            <Feather name='clipboard' size={13} color={Brand.secondary} />

            <AppText style={styles.pasteText}>{t('join.paste')}</AppText>
        </PopPressable>
    );

    const slots = (
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

            {/* Invisible, and on top so it takes the taps. */}
            <TextInput
                ref={field}
                value={code}
                // Codes read as one block of capitals.
                onChangeText={change}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={() => join(code)}
                maxLength={JOIN_CODE_LENGTH}
                autoCapitalize='characters'
                autoCorrect={false}
                returnKeyType='go'
                accessibilityLabel={t('join.codeLabel')}
                // `caretHidden` because the boxes draw their own.
                caretHidden
                style={styles.input}
            />
        </Pressable>
    );

    // The line under the boxes: which game this code belongs to, or why it opens nothing.
    const hint = (() => {
        if (rejected) return <AppText style={styles.rejected}>{t('join.rejected')}</AppText>;

        const game = gameForJoinCode(code);
        if (game === null) return null;

        return (
            <View style={styles.gameHint}>
                {/* The game's own accent, which is the same colour its home card and its header wear. */}
                <View style={[styles.gameDot, { backgroundColor: game.color }]} />

                <AppText style={styles.gameHintText}>
                    {t('join.gameHint', { game: game.name })}
                </AppText>
            </View>
        );
    })();

    return (
        <View style={styles.card}>
            {/* The paste chip rides the label's line rather than sitting under the boxes. */}
            <View style={styles.head}>
                <AppText style={styles.label}>{t('join.label')}</AppText>

                {pasteChip}
            </View>

            {slots}

            {/* Held at a fixed height so the card does not jump as the line appears and goes. */}
            <View style={styles.hintLine}>{hint}</View>
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
        <View
            style={[
                styles.slot,
                filled && styles.slotFilled,
                active && styles.slotActive
            ]}
        >
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
        // `Easing.step0` snaps rather than fades.
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
        ...theme.popShadow(theme.colors.shadow)
    },
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two,
        marginBottom: Spacing.three - 4
    },
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    slots: {
        flexDirection: 'row',
        // Centred, because the slots stop growing at MAX_SLOT and a wide card has room to spare.
        justifyContent: 'center',
        gap: SLOT_GAP
    },
    slot: {
        alignItems: 'center',
        justifyContent: 'center',
        // Height follows width, so six slots on a narrow phone become smaller boxes rather than tall thin letterboxes.
        aspectRatio: SLOT_ASPECT,
        // The row shares out the card's width, up to the point where a slot stops being a key and starts being a panel.
        flex: 1,
        flexBasis: 0,
        minWidth: MIN_SLOT,
        maxWidth: MAX_SLOT,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        // A quiet solid line rather than a dashed one.
        borderColor: theme.colors.boardEmptyBorder,
        backgroundColor: theme.colors.background
    },
    slotFilled: {
        // A slot that has been answered climbs back to the card's own surface and takes a full-strength line.
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
        fontSize: SLOT_FONT,
        fontWeight: 900,
        // Outfit Black is wide; without pulling it in, a full slot touches its own border.
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    caret: {
        width: 2,
        height: Math.round(SLOT_FONT * 0.85),
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
        fontSize: SLOT_FONT,
        textAlign: 'center',
        color: theme.colors.text
    },
    // The line under the boxes, at a fixed height whether or not it has anything in it.
    hintLine: {
        height: 22,
        justifyContent: 'center',
        // Centred with the slots above it.
        alignItems: 'center'
    },
    gameHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    gameDot: {
        width: 7,
        height: 7,
        borderRadius: 999
    },
    gameHintText: {
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    rejected: {
        fontSize: 12,
        fontWeight: 700,
        // The one red on this card.
        color: Brand.destructive
    },
    paste: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 11,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        // A quiet outline: this is the second way to fill the field.
        borderColor: theme.colors.borderSubtle,
        backgroundColor: theme.colors.backgroundElement
    },
    pasteText: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.text
    }
}))
