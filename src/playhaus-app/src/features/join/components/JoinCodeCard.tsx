import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { gameForJoinCode } from "@/constants/games";
import { Brand, fontFamilyForWeight, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ScanToJoin from "@/features/join/components/ScanToJoin";
import { JOIN_CODE_LENGTH, resolveJoinCode, sanitize } from "@/features/join/join-code";
import { codeFromScan } from "@/features/join/join-link";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { RelativePathString, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, TextInput, useWindowDimensions, View } from "react-native";

/** Half a blink. The caret is on for this long, then off for this long. */
const BLINK_MS = 550;

const SLOTS = Array.from({ length: JOIN_CODE_LENGTH }, (_, index) => index);

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

/**
 * The padding each half wears in the row arrangement.
 *
 * Carried by the columns rather than the card, because the rule between them runs the
 * full height and a card with its own padding would hold it off both ends.
 */
const COLUMN_PADDING = Spacing.three + 4;

/**
 * The least the scan half may be given before the row is not worth having.
 *
 * Under this the tile and its two lines of copy stop reading as a panel you could aim a
 * phone at and start reading as a squeezed afterthought — at which point the stacked
 * arrangement, where scanning gets a whole row to itself, is the better one.
 */
const SCAN_MIN = 170;

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
 * enough width for the scan panel beside it, and a six-character one does not — so the
 * same test that splits the card today keeps it stacked the day codes get longer, with
 * nobody having to remember to come back here. See `isWide`.
 */
const CLUSTER_WIDTH = JOIN_CODE_LENGTH * MAX_SLOT + (JOIN_CODE_LENGTH - 1) * SLOT_GAP;

/**
 * Whether the card has the width to stand its two halves side by side.
 *
 * Asked of the window, answered about the card: the page column is a fixed shape, so one
 * follows from the other. The card takes the column's width or the window's, whichever
 * runs out first.
 */
function isWide(window: number): boolean {
    const card = Math.min(PAGE_COLUMN, window - PAGE_GUTTER * 2);

    return card >= COLUMN_PADDING * 2 + CLUSTER_WIDTH + SCAN_MIN;
}

/**
 * A slot is a little taller than it is wide — the proportion of a key rather than a
 * square. Height follows width through `aspectRatio`, so a row that has to shrink stays
 * the same shape instead of turning into a rank of tall thin panels.
 */
const SLOT_ASPECT = 0.86;

/**
 * Type size is the one thing that cannot follow the box, so it follows the code length
 * instead — a constant, known here at module load. Five slots on a narrow phone are
 * already tight enough that the larger size would sit on its own borders, which is why
 * the prefix arriving cost nothing here: the card was written expecting it.
 */
const SLOT_FONT = JOIN_CODE_LENGTH > 4 ? 21 : 26;

/** The scan tile, in each arrangement. Big enough on the wide one to be the panel's subject. */
const SCAN_TILE_SMALL = 44;
const SCAN_TILE_LARGE = 88;

/** How far the sweep travels either side of centre, as a share of the tile. */
const SWEEP_REACH = 0.3;
const SWEEP_MS = 2400;

/**
 * Enter a join code and join someone else's game — by typing it, or by pointing the
 * camera at the host's screen.
 *
 * This card knows no routes, and that is the load-bearing thing about it. It is mounted on
 * three pages — `/reconnect`, League of Letters and One of Us — and it used to push a
 * League of Letters room whatever page it was standing on, which meant a player typing a
 * code on the One of Us page was marched into a word game. Where a code goes is now
 * `resolveJoinCode`'s answer, read off the code's first character, and the card cannot
 * override it because it does not import `ROUTES` at all.
 *
 * The code is drawn as one box per character, but it is typed into a single `TextInput`
 * laid over the whole row at zero opacity. One field rather than several is what makes
 * the platform's own behaviour work — paste drops a whole code in, backspace walks back
 * through it, autofill from a message can fill it — none of which survives being split
 * across inputs that hand focus to each other.
 *
 * The card is a stack on a phone and a row on anything wider, and the two halves are the
 * two ways in: the boxes, and the camera. Stacked, scanning is a row under the code with
 * a rule above it; in a row it is a column of its own behind a full-height rule. The
 * width goes to the second way in rather than to air around the first, which on a laptop
 * beside a host holding their phone is often the faster of the two.
 *
 * There is no submit button. A code is a fixed number of characters, so the last one
 * someone types is unambiguously the end of it, and a button would only be a second way
 * to say what the field already knows. A scanned code takes the identical path.
 */
export default function JoinCodeCard() {
    const styles = useStyles();
    const t = useT();

    const { width } = useWindowDimensions();
    const wide = isWide(width);

    const router = useRouter();
    const field = useRef<TextInput>(null);

    const [code, setCode] = useState('');
    const [focused, setFocused] = useState(false);
    const [scanning, setScanning] = useState(false);

    /**
     * What to say about a code that went nowhere, or null when there is nothing to say.
     *
     * A line under the boxes rather than an alert: the field is still sitting there with
     * the code in it, and the next thing to do is fix a character — which an alert would be
     * standing in front of.
     */
    const [rejected, setRejected] = useState(false);

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
        if (sent.current) return;

        const target = resolveJoinCode(value);

        // Still being typed. Nothing to say and nothing to do — least of all a refusal,
        // which at three characters in would be a complaint about an unfinished sentence.
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

        // Editing back down to an incomplete code is the signal that this is a fresh
        // attempt, so the next completion is allowed to travel — and the refusal that was
        // standing under the boxes is about a code that no longer exists.
        if (next.length < JOIN_CODE_LENGTH) {
            sent.current = false;
            setRejected(false);
        }

        setCode(next);
        join(next);
    }

    /**
     * A whole code, arriving at once: read off a QR, or lifted out of a pasted link.
     *
     * The latch is cleared first rather than trusted. A player who typed a dead code, came
     * back to this card and then aimed the camera at a QR instead would otherwise be
     * holding a phone at something this card has already decided not to act on — and
     * reaching for the camera, or for paste, is a fresh attempt by definition.
     *
     * The slots are filled on the way past so the card shows what arrived, which is the
     * only feedback there is between the panel closing and the room opening.
     */
    function acceptCode(value: string) {
        sent.current = false;
        setRejected(false);

        setCode(value);
        join(value);
    }

    async function paste() {
        try {
            const clipboard = await Clipboard.getStringAsync();

            // A whole join link is the likeliest thing on the clipboard now that the host's
            // screen offers one to share, and `sanitize` alone makes a nonsense of it —
            // it keeps the first four code characters it sees, which for a URL is `HTTP`.
            // `codeFromScan` is the rule that understands a link, so it gets first refusal
            // and the lenient path only handles what it turns down.
            const linked = codeFromScan(clipboard);

            if (linked !== null) {
                acceptCode(linked);
                return;
            }

            change(clipboard);
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
                    wide={wide}
                />
            ))}

            {/* Invisible, and on top so it takes the taps. Kept at the row's own size
                rather than shrunk to nothing: a zero-height field is one some browsers
                refuse to focus, and a small font size makes iOS Safari zoom the page on
                focus. */}
            <TextInput
                ref={field}
                value={code}
                // Codes read as one block of capitals, so the field owns that rather than
                // trusting every keyboard to honour `autoCapitalize`.
                onChangeText={change}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={() => join(code)}
                maxLength={JOIN_CODE_LENGTH}
                autoCapitalize='characters'
                autoCorrect={false}
                returnKeyType='go'
                accessibilityLabel={t('join.codeLabel')}
                // `caretHidden` because the boxes draw their own, and the real one would
                // be sitting at the far left of an invisible field.
                caretHidden
                style={styles.input}
            />
        </Pressable>
    );

    /**
     * The line under the boxes: which game this code belongs to, or why it opens nothing.
     *
     * The game appears on the *first* keystroke, and that is the point of it rather than a
     * flourish. `O` is One of Us's letter and `0` is not in the alphabet, so a leading zero
     * is read as the letter — sensible, and silent. Naming the game straight away is what
     * turns a mistyped first character into something you see before you have typed the
     * second, instead of a refusal five characters later with no clue which one was wrong.
     *
     * One line for both messages because they cannot both be true: a code whole enough to
     * be refused has a first character, and if that character named a game with somewhere
     * to go it would not have been refused. Keeping them in one row also keeps the card
     * from growing a line and shunting the scan half down as you type.
     */
    const hint = (() => {
        if (rejected) return <AppText style={styles.rejected}>{t('join.rejected')}</AppText>;

        const game = gameForJoinCode(code);
        if (game === null) return null;

        return (
            <View style={styles.gameHint}>
                {/* The game's own accent, which is the same colour its home card and its
                    header wear — so the confirmation is recognisable before it is read. */}
                <View style={[styles.gameDot, { backgroundColor: game.color }]} />

                <AppText style={styles.gameHintText}>
                    {t('join.gameHint', { game: game.name })}
                </AppText>
            </View>
        );
    })();

    return (
        <>
            <View style={[styles.card, wide ? styles.cardWide : styles.cardStacked]}>
                {wide
                    ? (
                        <>
                            <View style={styles.typeColumn}>
                                <AppText style={styles.label}>{t('join.labelWide')}</AppText>

                                <View style={styles.slotsWide}>{slots}</View>

                                {/* Held at a fixed height so the row does not jump as the
                                    line appears and goes. */}
                                <View style={styles.hintLine}>{hint}</View>

                                <View style={styles.footWide}>{pasteChip}</View>
                            </View>

                            <ScanPanel onPress={() => setScanning(true)} />
                        </>
                    )
                    : (
                        <>
                            {/* The paste chip rides the label's line rather than sitting
                                under the boxes: stacked, the space under them belongs to
                                the scan row, and two controls on that line would make the
                                second way in compete with a shortcut to the first. */}
                            <View style={styles.head}>
                                <AppText style={styles.label}>{t('join.label')}</AppText>

                                {pasteChip}
                            </View>

                            {slots}

                            <View style={styles.hintLine}>{hint}</View>

                            <ScanRow onPress={() => setScanning(true)} />
                        </>
                    )}
            </View>

            <ScanToJoin
                visible={scanning}
                onCode={acceptCode}
                onClose={() => setScanning(false)}
            />
        </>
    )
}

interface ScanProps {
    onPress: () => void
}

/**
 * The scan half, stacked: a quiet row under the code with a rule above it.
 *
 * A row rather than a second card, because there is only one card here and scanning is
 * the other half of it. The rule is what says so — the same device the design uses to
 * split the wide arrangement, laid on its side.
 */
function ScanRow({ onPress }: ScanProps) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <PopPressable
            style={styles.scanRow}
            onPress={onPress}
            accessibilityRole='button'
            accessibilityLabel={t('join.scanLabel')}
        >
            <ScanTile size={SCAN_TILE_SMALL} />

            <View style={styles.scanRowCopy}>
                <AppText style={styles.scanRowTitle}>{t('join.scanRowTitle')}</AppText>

                <AppText style={styles.scanRowHint}>{t('join.scanRowHint')}</AppText>
            </View>

            <Feather name='chevron-right' size={17} color={theme.colors.text} />
        </PopPressable>
    )
}

/**
 * The scan half, in a row: its own column behind a full-height rule.
 *
 * Tinted a step off the card so the split reads as two surfaces rather than one surface
 * with a line drawn on it, which is what makes the arrangement look deliberate at widths
 * where the boxes alone would leave the card half empty.
 */
function ScanPanel({ onPress }: ScanProps) {
    const styles = useStyles();
    const t = useT();

    return (
        // A plain `Pressable`, unlike every other control on this card. `PopPressable`
        // scales what it wraps, and this column reaches all four of the card's edges
        // inside `overflow: 'hidden'` — so the pop would be clipped on the way out and
        // would open a gap onto the card behind it on the way in. The pressed opacity is
        // the feedback instead, which is the right weight for a panel this size anyway.
        <Pressable
            style={({ pressed }) => [styles.scanColumn, pressed && styles.scanColumnHeld]}
            onPress={onPress}
            accessibilityRole='button'
            accessibilityLabel={t('join.scanLabel')}
        >
            <ScanTile size={SCAN_TILE_LARGE} />

            <AppText style={styles.scanPanelTitle}>{t('join.scanAction')}</AppText>

            <AppText style={styles.scanPanelCopy}>{t('join.scanCopy')}</AppText>
        </Pressable>
    )
}

/**
 * The dark tile with a line sweeping across it.
 *
 * The sweep is the whole reason this is not just an icon: a viewfinder reticle is a
 * static shape that could be anything, and the one thing that reads instantly as
 * *scanning* is something moving across it. Small, slow and looping, so it sits in the
 * corner of the eye rather than pulling at it.
 */
function ScanTile({ size }: { size: number }) {
    const styles = useStyles();
    const [sweep] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(sweep, {
                    toValue: 1,
                    duration: SWEEP_MS / 2,
                    // Eased at both ends: a linear sweep bounces off the edges like a
                    // pong ball, where this one settles and turns.
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true
                }),
                Animated.timing(sweep, {
                    toValue: 0,
                    duration: SWEEP_MS / 2,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true
                })
            ])
        );

        loop.start();

        return () => loop.stop();
    }, [sweep]);

    const reach = size * SWEEP_REACH;

    return (
        <View style={[styles.scanTile, { width: size, height: size, borderRadius: size * 0.3 }]}>
            <Feather name='maximize' size={Math.round(size * 0.42)} color={Brand.lemon} />

            <Animated.View
                style={[
                    styles.sweep,
                    {
                        transform: [{
                            translateY: sweep.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-reach, reach]
                            })
                        }]
                    }
                ]}
            />
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
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border))
    },
    cardStacked: {
        padding: Spacing.three
    },
    cardWide: {
        flexDirection: 'row',
        // Stretch rather than centre: the rule between the halves is the scan column's
        // own left border, and it only runs the full height if that column does.
        alignItems: 'stretch',
        // The rule and the tint both reach the card's edge, so the corners have to clip.
        overflow: 'hidden'
    },
    typeColumn: {
        // The boxes are drawn at full size here, so this column takes exactly the width
        // they need and hands the rest to the scan panel.
        flexShrink: 0,
        padding: COLUMN_PADDING
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
    slotsWide: {
        marginTop: Spacing.three - 2
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
    // scan panel beside it happened to leave over.
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
    /**
     * The line under the boxes, at a fixed height whether or not it has anything in it.
     *
     * Reserved rather than grown into: this row fills in on the first keystroke and empties
     * again on a backspace, and a card that changed height each time would walk the scan
     * half up and down the page under the thumb reaching for it.
     */
    hintLine: {
        height: 22,
        justifyContent: 'center'
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
        // The one red on this card. A refusal that shared the hint's colour would be a
        // sentence you have to read to notice it was a refusal.
        color: Brand.destructive
    },
    footWide: {
        marginTop: Spacing.three - 2,
        flexDirection: 'row',
        justifyContent: 'flex-start'
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
    },
    scanRow: {
        marginTop: Spacing.three - 2,
        paddingTop: Spacing.three - 2,
        // The rule, stacked. Subtle because it is dividing one card rather than joining
        // two, and a full-strength line here would read as the edge of something.
        borderTopWidth: theme.borderWidth,
        borderTopColor: theme.colors.borderSubtle,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three - 4
    },
    scanRowCopy: {
        flex: 1,
        minWidth: 0
    },
    scanRowTitle: {
        fontSize: 13.5,
        fontWeight: 900,
        color: theme.colors.text
    },
    scanRowHint: {
        marginTop: 2,
        fontSize: 11.5,
        fontWeight: 500,
        color: theme.colors.textMuted
    },
    scanColumn: {
        // Takes whatever the boxes do not — they are already as big as they should ever
        // be. `flexBasis: 0` because `flex: 1` alone would let this be sized by its own
        // text and leave the row's spare width unclaimed.
        flex: 1,
        flexBasis: 0,
        minWidth: 0,
        padding: COLUMN_PADDING,
        alignItems: 'center',
        justifyContent: 'center',
        // The rule, in a row. Full height because the column reaches both edges of the
        // card, which is what `alignItems: 'stretch'` above is for.
        borderLeftWidth: theme.borderWidth,
        borderLeftColor: theme.colors.borderSubtle,
        backgroundColor: theme.colors.backgroundElement
    },
    scanColumnHeld: {
        backgroundColor: theme.colors.backgroundSelected
    },
    scanPanelTitle: {
        marginTop: 13,
        fontSize: 14.5,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },
    scanPanelCopy: {
        marginTop: 5,
        textAlign: 'center',
        fontSize: 12,
        lineHeight: 12 * 1.4,
        fontWeight: 500,
        color: theme.colors.textSecondary
    },
    scanTile: {
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        // Clips the sweep to the tile, which is the only thing keeping it from running
        // out across the card.
        overflow: 'hidden',
        borderWidth: theme.borderWidth,
        // Ink in both schemes: the tile is a lens, and a lens is dark. In light that is
        // the page's own hard line around it; in dark the tile would otherwise dissolve
        // into the canvas, so the border is what holds its shape.
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: Brand.ink
    },
    sweep: {
        position: 'absolute',
        left: '14%',
        right: '14%',
        height: 2,
        borderRadius: 2,
        backgroundColor: Brand.primary
    }
}))
