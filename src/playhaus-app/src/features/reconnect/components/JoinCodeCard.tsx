import { LOBBY_CODE_LENGTH } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { ROUTES } from "@/constants/routes";
import { fontFamilyForWeight, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { RelativePathString, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, TextInput, useWindowDimensions, View } from "react-native";

/** Half a blink. The caret is on for this long, then off for this long. */
const BLINK_MS = 550;

const SLOTS = Array.from({ length: LOBBY_CODE_LENGTH }, (_, index) => index);

/**
 * The page's own shape, repeated here.
 *
 * `app/_layout.tsx` centres every page in a 600pt column with 24pt of gutter either
 * side, which fixes the card's width exactly — so the window is as good an answer as the
 * card itself could give, a frame earlier and without a layout pass that would flash the
 * wrong arrangement onto the first paint. `BottomBar` repeats the same figure for the
 * same reason.
 */
const PAGE_COLUMN = 600;
const PAGE_GUTTER = Spacing.four;

/** The card's own padding in the row arrangement, and the gap between its two columns. */
const CARD_PADDING = Spacing.three + 4;
const COLUMN_GAP = Spacing.four;

/**
 * The least the copy column may be given before the row is not worth having.
 *
 * Under this the label starts breaking across lines and the hint turns into a column of
 * two-word rows, which is worse than the stack it was supposed to improve on.
 */
const COPY_MIN = 200;

/**
 * How big a slot may get, and the least it may keep.
 *
 * The cap is what stops a short code stretching into letterboxes across a wide card; the
 * floor is the point below which a capital stops being readable. Between them the row
 * simply fits, which is why a six-character code needs no second layout — only smaller
 * boxes. The floor is low enough that six of them still fit a 320pt phone, the narrowest
 * screen the app runs on.
 */
const MIN_SLOT = 30;
const MAX_SLOT = 60;

const SLOT_GAP = Spacing.two;

/**
 * How much room the whole row of slots needs at full size.
 *
 * This is what decides the arrangement: a four-character code leaves a browser column
 * enough width for copy beside it, and a six-character one does not — so the same test
 * that splits the card today keeps it stacked the day codes get longer, with nobody
 * having to remember to come back here. See `isWide`.
 */
const CLUSTER_WIDTH = LOBBY_CODE_LENGTH * MAX_SLOT + (LOBBY_CODE_LENGTH - 1) * SLOT_GAP;

/**
 * Whether the card has the width to stand its two halves side by side.
 *
 * Asked of the window, answered about the card: the page column is a fixed shape, so one
 * follows from the other. The card takes the column's width or the window's, whichever
 * runs out first.
 */
function isWide(window: number): boolean {
    const card = Math.min(PAGE_COLUMN, window - PAGE_GUTTER * 2);

    return card - CARD_PADDING * 2 >= CLUSTER_WIDTH + COLUMN_GAP + COPY_MIN;
}

/**
 * A slot is a little taller than it is wide — the proportion of a key rather than a
 * square. Height follows width through `aspectRatio`, so a row that has to shrink stays
 * the same shape instead of turning into a rank of tall thin panels.
 */
const SLOT_ASPECT = 0.86;

/**
 * Type size is the one thing that cannot follow the box, so it follows the code length
 * instead — a constant, known here at module load. Six slots on a narrow phone are tight
 * enough that the four-character size would sit on its own borders.
 */
const SLOT_FONT = LOBBY_CODE_LENGTH > 4 ? 21 : 26;

/**
 * Everything a code is allowed to be. Anything else is dropped as it arrives, which is
 * what lets a pasted "code: ab-cd" become `ABCD` rather than being refused.
 */
function sanitize(text: string): string {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LOBBY_CODE_LENGTH);
}

/**
 * Enter a lobby code and join someone else's game.
 *
 * The code is drawn as one box per character, but it is typed into a single `TextInput`
 * laid over the whole row at zero opacity. One field rather than several is what makes
 * the platform's own behaviour work — paste drops a whole code in, backspace walks back
 * through it, autofill from a message can fill it — none of which survives being split
 * across inputs that hand focus to each other.
 *
 * The card is a stack on a phone and a row on anything wider: what this is for on one
 * side, the boxes on the other. Stacked at full width the row is the widest thing on the
 * card and reads as the point of it — but the same arrangement in a 550pt browser column
 * leaves a small cluster of boxes marooned in the middle of a lot of nothing, with its
 * label and its footnote pinned to opposite corners. Two columns hand the spare width to
 * the copy, which is the half that can use it.
 *
 * There is no submit button. A code is a fixed number of characters, so the last one
 * someone types is unambiguously the end of it, and a button would only be a second way
 * to say what the field already knows. The hint admits that it acts on its own, because
 * a form that does had better say so before it does it.
 */
export default function JoinCodeCard() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const { width } = useWindowDimensions();
    const wide = isWide(width);

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

    const pasteChip = (
        <PopPressable
            style={styles.paste}
            onPress={() => void paste()}
            accessibilityRole='button'
            accessibilityLabel={t('lol.index.join.pasteLabel')}
        >
            <Feather name='clipboard' size={13} color={theme.colors.focus} />

            <AppText style={styles.pasteText}>{t('lol.index.join.paste')}</AppText>
        </PopPressable>
    );

    return (
        <View style={[styles.card, wide && styles.cardWide]}>
            {/* The half that says what this is, and the half that gets the leftover
                width — the boxes are already as big as they should ever be. */}
            <View style={[styles.copy, wide && styles.copyWide]}>
                <AppText style={styles.label}>{t('lol.index.join.label')}</AppText>
            </View>

            {/* Nothing wraps the boxes when stacked — the row already fills the card —
                so this only takes a style in the row arrangement. */}
            <View style={wide && styles.entryWide}>
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
                            wide={wide}
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
                        accessibilityLabel={t('lol.index.join.codeLabel')}
                        // `caretHidden` because the boxes draw their own, and the real one
                        // would be sitting at the far left of an invisible field.
                        caretHidden
                        style={styles.input}
                    />
                </Pressable>

                {/* Stacked, the footnote and the paste control share the line under the
                    boxes and hold the card's two edges. In a row the footnote has already
                    been said on the other side, so only the chip is left — tucked under
                    the boxes rather than under the card, where it stays part of the field
                    instead of becoming a corner of its own. */}
                <View style={[styles.foot, wide && styles.footWide]}>
                    {pasteChip}
                </View>
            </View>
        </View>
    )
}

interface SlotProps {
    character: string | undefined,
    /** Whether this is the slot the next character lands in. */
    active: boolean,
    /** In a row the slots are a fixed cluster; stacked they share out the card's width. */
    wide: boolean
}

/** One character of the code: filled, waiting with a caret, or an empty box. */
function Slot({ character, active, wide }: SlotProps) {
    const styles = useStyles();
    const filled = character !== undefined;

    return (
        <View
            style={[
                styles.slot,
                wide ? styles.slotFixed : styles.slotFluid,
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
    cardWide: {
        flexDirection: 'row',
        // Centres rather than tops: two short lines of copy against a cluster of boxes
        // half again as tall, and hanging them from the top leaves them floating.
        alignItems: 'center',
        // The same two figures `isWide` measures with, so what it allowed for is what
        // actually gets drawn.
        gap: COLUMN_GAP,
        padding: CARD_PADDING
    },
    copy: {
        // Stacked, the label is a caption on the boxes below it and sits close on them.
        marginBottom: Spacing.three - 4
    },
    copyWide: {
        // Takes whatever the boxes do not. `flexBasis: 0` because `flex: 1` alone would
        // let this be sized by its own text and leave the row's spare width unclaimed.
        flex: 1,
        flexBasis: 0,
        minWidth: 0,
        marginBottom: 0
    },
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    entryWide: {
        // The boxes are drawn at full size here, so this column takes exactly the width
        // they need and gives the rest away.
        flexShrink: 0,
        alignItems: 'flex-end'
    },
    slots: {
        flexDirection: 'row',
        gap: SLOT_GAP
    },
    slot: {
        alignItems: 'center',
        justifyContent: 'center',
        // Height follows width, so six slots on a narrow phone become smaller boxes
        // rather than tall thin letterboxes.
        aspectRatio: SLOT_ASPECT,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        // A quiet solid line rather than a dashed one. Few enough boxes to read as a code
        // at a glance, and dashes at this size turn the row into a dotted band.
        borderColor: theme.colors.boardEmptyBorder,
        backgroundColor: theme.colors.background
    },
    // Stacked: the row shares out the card's width, up to the point where a slot stops
    // being a key and starts being a panel.
    slotFluid: {
        flex: 1,
        flexBasis: 0,
        minWidth: MIN_SLOT,
        maxWidth: MAX_SLOT
    },
    // In a row: a fixed cluster, because a stretched one would be sized by whatever the
    // copy beside it happened to leave over.
    slotFixed: {
        width: MAX_SLOT
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
    foot: {
        marginTop: 10,
        flexDirection: 'row',
        // The footnote is body copy and the chip is a control, so it is their centres
        // that should agree rather than their baselines.
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    footWide: {
        justifyContent: 'flex-end'
    },
    hint: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: 500,
        color: theme.colors.textMuted
    },
    hintWide: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 13 * 1.45,
        color: theme.colors.textSecondary
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
        // A quiet outline: this is the second way to fill the field, and a full-strength
        // line would have it competing with the boxes it belongs to.
        borderColor: theme.colors.borderSubtle,
        backgroundColor: theme.colors.backgroundElement
    },
    pasteText: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.text
    }
}))
