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

// The page's own shape, repeated here.
const PAGE_COLUMN = 600;
const PAGE_GUTTER = Spacing.four;

// The padding each half wears in the row arrangement.
const COLUMN_PADDING = Spacing.three + 4;

// The least the scan half may be given before the row is not worth having.
const SCAN_MIN = 170;

// How big a slot may get, and the least it may keep.
const MIN_SLOT = 30;
const MAX_SLOT = 60;

const SLOT_GAP = Spacing.two;

// How much room the whole row of slots needs at full size.
const CLUSTER_WIDTH = JOIN_CODE_LENGTH * MAX_SLOT + (JOIN_CODE_LENGTH - 1) * SLOT_GAP;

// Whether the card has the width to stand its two halves side by side.
function isWide(window: number): boolean {
    const card = Math.min(PAGE_COLUMN, window - PAGE_GUTTER * 2);

    return card >= COLUMN_PADDING * 2 + CLUSTER_WIDTH + SCAN_MIN;
}

// A slot is a little taller than it is wide — the proportion of a key rather than a square.
const SLOT_ASPECT = 0.86;

// Type size is the one thing that cannot follow the box, so it follows the code length instead.
const SLOT_FONT = JOIN_CODE_LENGTH > 4 ? 21 : 26;

/** The scan tile, in each arrangement. Big enough on the wide one to be the panel's subject. */
const SCAN_TILE_SMALL = 44;
const SCAN_TILE_LARGE = 88;

/** How far the sweep travels either side of centre, as a share of the tile. */
const SWEEP_REACH = 0.3;
const SWEEP_MS = 2400;

// Enter a join code and join someone else's game — by typing it, or by pointing the camera at the host's screen.
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

    // A whole code, arriving at once: read off a QR, or lifted out of a pasted link.
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
            const linked = codeFromScan(clipboard);

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
                    wide={wide}
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
        <>
            <View style={[styles.card, wide ? styles.cardWide : styles.cardStacked]}>
                {wide
                    ? (
                        <>
                            <View style={styles.typeColumn}>
                                <AppText style={styles.label}>{t('join.labelWide')}</AppText>

                                <View style={styles.slotsWide}>{slots}</View>

                                {/* Held at a fixed height so the row does not jump as the line appears and goes. */}
                                <View style={styles.hintLine}>{hint}</View>

                                <View style={styles.footWide}>{pasteChip}</View>
                            </View>

                            <ScanPanel onPress={() => setScanning(true)} />
                        </>
                    )
                    : (
                        <>
                            {/* The paste chip rides the label's line rather than sitting under the boxes. */}
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

// The scan half, stacked: a quiet row under the code with a rule above it.
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

// The scan half, in a row: its own column behind a full-height rule.
function ScanPanel({ onPress }: ScanProps) {
    const styles = useStyles();
    const t = useT();

    return (
        // A plain `Pressable`, unlike every other control on this card.
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

// The dark tile with a line sweeping across it.
function ScanTile({ size }: { size: number }) {
    const styles = useStyles();
    const [sweep] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(sweep, {
                    toValue: 1,
                    duration: SWEEP_MS / 2,
                    // Eased at both ends: a linear sweep bounces off the edges like a pong ball, where this one settles and turns.
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
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },
    cardStacked: {
        padding: Spacing.three
    },
    cardWide: {
        flexDirection: 'row',
        // Stretch rather than centre: the rule between the halves is the scan column's own left border.
        alignItems: 'stretch',
        // The rule and the tint both reach the card's edge, so the corners have to clip.
        overflow: 'hidden'
    },
    typeColumn: {
        // The boxes are drawn at full size here.
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
        // Height follows width, so six slots on a narrow phone become smaller boxes rather than tall thin letterboxes.
        aspectRatio: SLOT_ASPECT,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        // A quiet solid line rather than a dashed one.
        borderColor: theme.colors.boardEmptyBorder,
        backgroundColor: theme.colors.background
    },
    // Stacked: the row shares out the card's width, up to the point where a slot stops being a key and starts being a panel.
    slotFluid: {
        flex: 1,
        flexBasis: 0,
        minWidth: MIN_SLOT,
        maxWidth: MAX_SLOT
    },
    // In a row: a fixed cluster, because a stretched one would be sized by whatever the scan panel beside it happened to leave over.
    slotFixed: {
        width: MAX_SLOT
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
        // The one red on this card.
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
        // A quiet outline: this is the second way to fill the field.
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
        // The rule, stacked.
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
        // Takes whatever the boxes do not — they are already as big as they should ever be.
        flex: 1,
        flexBasis: 0,
        minWidth: 0,
        padding: COLUMN_PADDING,
        alignItems: 'center',
        justifyContent: 'center',
        // The rule, in a row.
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
        // Clips the sweep to the tile, which is the only thing keeping it from running out across the card.
        overflow: 'hidden',
        borderWidth: theme.borderWidth,
        // Ink in both schemes: the tile is a lens, and a lens is dark.
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
