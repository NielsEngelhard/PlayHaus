import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
    Animated,
    Easing,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    useWindowDimensions,
    View
} from "react-native";

export interface SelectOption<T extends string> {
    value: T,
    label: string,
    /** Optional second line. Shown in the open list only — the field stays one line. */
    description?: string,
    /**
     * Drawn to the left of the label, in the field and in every row. A node rather
     * than an icon name so a caller can put anything there — `LanguageSelect` puts
     * a `CountryFlag` in it, which is an image and not a glyph.
     *
     * The slot is reserved for every row as soon as one option fills it, so a list
     * where only some options have one still lines its labels up.
     */
    icon?: ReactNode
}

interface Props<T extends string> {
    label: string,
    value: T,
    options: readonly SelectOption<T>[],
    onChange: (value: T) => void,
    /** Greyed out and unopenable — for a field whose save is still in the air. */
    disabled?: boolean,
    /**
     * `card` (the default) is the standing shape: a `Card` of its own, its label above
     * the field. `inline` drops both — the card *and* the label — leaving just the
     * field, for a caller that is already a card and has already named this row.
     *
     * The lobby's settings card is the one caller: it holds the same two knobs the solo
     * setup screen does, in a fraction of the height, and a card inside a card with two
     * labels stacked on top of each other is what that would otherwise be.
     */
    variant?: 'card' | 'inline'
}

/** Where the field is on screen, so the list can be put under it. */
interface Anchor {
    x: number,
    y: number,
    width: number,
    height: number
}

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Opacity and translate are driver-safe elsewhere.
const useNativeDriver = Platform.OS !== 'web';

/** Matches `PopupModal`: in quicker than out. */
const OPEN_MS = 140;
const CLOSE_MS = 110;

/** The list arrives from the field's edge, so it reads as coming out of it. */
const FROM_LIFT = 8;

/** Between the field and the list, and between the list and the screen's edges. */
const GAP = Spacing.one;
const SCREEN_MARGIN = Spacing.three;

/** Below this there is not enough room to be worth opening downwards. */
const MIN_ROOM = 140;

/**
 * Pick one of a list, the way a browser's `select` does it: the field stays where
 * it is and the options float over the page under it, rather than pushing
 * everything below them down.
 *
 * The list lives in a `Modal`, which is what makes that possible. Rendering it in
 * place would mean an absolutely positioned box fighting the stacking order of
 * whatever card comes next, and — because the cards in this app all sit a fraction
 * of a degree off-square — inheriting its parent's rotation. A `Modal` is its own
 * root, so the list is upright and on top of everything without either fight.
 *
 * The cost is that the position has to be measured rather than inherited, which is
 * what `Anchor` is. It is taken once, when the field is tapped: the modal covers
 * the page while it is open, so nothing behind it can scroll out from under the
 * list in the meantime.
 */
export default function SelectInput<T extends string>({
    label,
    value,
    options,
    onChange,
    disabled = false,
    variant = 'card'
}: Props<T>) {
    const theme = useTheme();
    const styles = useStyles();

    const field = useRef<View>(null);
    const [anchor, setAnchor] = useState<Anchor | null>(null);
    const [open, setOpen] = useState(false);
    const { height: windowHeight } = useWindowDimensions();

    /**
     * The modal has to outlive `open`, or closing would tear the list off screen
     * with the animation meant to see it out still to play. Same shape as
     * `PopupModal`: raised during render, dropped by the animation itself.
     */
    const [present, setPresent] = useState(false);
    if (open && !present) setPresent(true);

    const [motion] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const move = Animated.timing(motion, {
            toValue: open ? 1 : 0,
            duration: open ? OPEN_MS : CLOSE_MS,
            easing: open ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
            useNativeDriver
        });

        move.start(({ finished }) => {
            // Interrupted means `open` changed again and the next run owns the list.
            if (finished && !open) setPresent(false);
        });

        return () => move.stop();
    }, [open, motion]);

    const selected = options.find(option => option.value === value);

    /**
     * Any option having an icon reserves the slot for all of them, so a list that
     * mixes the two still reads as a column of labels rather than a ragged edge.
     */
    const withIcons = options.some(option => option.icon !== undefined);

    function show() {
        if (disabled) return;

        // Measured rather than remembered: the field moves with the page, and the
        // last place it was is not where it is now.
        //
        // `measureInWindow` reports the field's untransformed layout box on native,
        // so the house tilt every card wears is not accounted for. At half a degree
        // that is a pixel or two over a card's width, which is under the rounding
        // this list is placed with anyway.
        field.current?.measureInWindow((x, y, width, height) => {
            setAnchor({ x, y, width, height });
            setOpen(true);
        });
    }

    function choose(option: SelectOption<T>) {
        onChange(option.value);
        setOpen(false);
    }

    // Below the field when there is room for a usable list, above it when there is
    // not — the same flip a browser does near the bottom of the window.
    const below = anchor === null ? 0 : windowHeight - (anchor.y + anchor.height) - GAP - SCREEN_MARGIN;
    const above = anchor === null ? 0 : anchor.y - GAP - SCREEN_MARGIN;
    const dropUp = below < MIN_ROOM && above > below;

    const body = (
        <>
            {/* The label belongs to the frame, so `inline` — which has no frame of its
                own — leaves naming this row to whoever is holding it. */}
            {variant === 'card' && (
                <AppText style={[styles.label, disabled && styles.dimmed]}>{label}</AppText>
            )}

            <Pressable
                ref={field}
                onPress={show}
                disabled={disabled}
                accessibilityRole='button'
                accessibilityLabel={`${label}: ${selected?.label ?? 'niets gekozen'}`}
                // `aria-expanded` rather than `accessibilityState={{ expanded }}`: the
                // latter never reaches the DOM in this version, so the field would open
                // without announcing that it had.
                aria-expanded={open}
                style={[
                    styles.field,
                    variant === 'inline' && styles.fieldInline,
                    disabled && styles.fieldDisabled
                ]}
            >
                {withIcons && (
                    <View style={styles.fieldIcon}>{selected?.icon}</View>
                )}

                {/* A value with no matching option means the caller and the list are out of
                    step. Show an em dash rather than an empty field or a crash. */}
                <AppText style={[styles.fieldText, disabled && styles.dimmed]} numberOfLines={1}>
                    {selected?.label ?? '—'}
                </AppText>

                <Feather
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={disabled ? theme.colors.textSecondary : theme.colors.text}
                />
            </Pressable>

            {present && anchor !== null && (
                <Modal
                    visible
                    transparent
                    // Animated here, in one place, rather than half here and half in
                    // whatever each platform's own transition happens to be.
                    animationType='none'
                    statusBarTranslucent
                    // Android's back button and the web's Escape. A select is never a
                    // decision you have to make, so both simply close it.
                    onRequestClose={() => setOpen(false)}
                >
                    {/*
                      * No dim behind it. A browser's select does not darken the page it
                      * belongs to, and the field it came out of has to stay readable —
                      * this is only here to catch the tap that closes the list.
                      */}
                    <Pressable
                        style={styles.backdrop}
                        onPress={() => setOpen(false)}
                        accessibilityRole='button'
                        accessibilityLabel='Sluiten'
                    />

                    <Animated.View
                        style={[
                            styles.list,
                            {
                                left: anchor.x,
                                width: anchor.width,
                                maxHeight: Math.max(dropUp ? above : below, MIN_ROOM),
                                ...(dropUp
                                    ? { bottom: windowHeight - anchor.y + GAP }
                                    : { top: anchor.y + anchor.height + GAP }),
                                opacity: motion,
                                transform: [{
                                    translateY: motion.interpolate({
                                        inputRange: [0, 1],
                                        // Out of the field, whichever side it opened on.
                                        outputRange: [dropUp ? FROM_LIFT : -FROM_LIFT, 0]
                                    })
                                }]
                            }
                        ]}
                    >
                        <ScrollView
                            // The list is usually shorter than its ceiling; this keeps it
                            // that height rather than stretching it to fill.
                            style={styles.listScroll}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            {options.map((option, index) => (
                                <OptionRow
                                    key={option.value}
                                    option={option}
                                    selected={option.value === value}
                                    divided={index > 0}
                                    withIcon={withIcons}
                                    onPress={() => choose(option)}
                                />
                            ))}
                        </ScrollView>
                    </Animated.View>
                </Modal>
            )}
        </>
    );

    return variant === 'inline' ? <View>{body}</View> : <Card>{body}</Card>;
}

interface OptionRowProps<T extends string> {
    option: SelectOption<T>,
    selected: boolean,
    /** Every row but the first wears the divider above it. */
    divided: boolean,
    /** Some option in this list has an icon, so every row leaves room for one. */
    withIcon: boolean,
    onPress: () => void
}

function OptionRow<T extends string>({ option, selected, divided, withIcon, onPress }: OptionRowProps<T>) {
    const theme = useTheme();
    const styles = useStyles();

    const [hovered, setHovered] = useState(false);

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='radio'
            accessibilityLabel={option.label}
            // Same reason as the field above: `accessibilityState={{ checked }}` would
            // leave the chosen row looking selected but not announcing as selected.
            aria-checked={selected}
            // The pointer events do nothing on a touch screen, where there is no
            // pointer to be under a row that has not been tapped yet.
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            style={[styles.row, divided && styles.rowDivided, hovered && styles.rowHovered]}
        >
            {withIcon && <View style={styles.rowIcon}>{option.icon}</View>}

            <View style={styles.rowText}>
                <AppText style={styles.rowTitle}>{option.label}</AppText>

                {option.description && (
                    <AppText style={styles.rowDescription}>{option.description}</AppText>
                )}
            </View>

            <View style={[styles.check, selected ? styles.checkOn : styles.checkOff]}>
                {selected && (
                    <Feather name='check' size={16} color={theme.colors.textOnAccent} />
                )}
            </View>
        </Pressable>
    )
}

const CHECK_SIZE = 28;

/** Wide enough for a 24px flag, which is the widest thing that goes in the slot. */
const ICON_SLOT = 24;

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    // Sunken, the way a text input reads — this is somewhere you put a value, not a
    // button that does something.
    field: {
        marginTop: Spacing.three,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
        backgroundColor: theme.colors.backgroundInput,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        ...theme.shadows.hardSmall
    },
    // No label above it to be spaced off, and a shorter field: this one sits inside a
    // card that is already tight, where the standing 16pt of padding reads as slack.
    fieldInline: {
        marginTop: 0,
        paddingVertical: Spacing.two + 2,
        paddingHorizontal: Spacing.two + Spacing.one
    },
    fieldDisabled: {
        backgroundColor: theme.colors.muted
    },
    dimmed: {
        opacity: 0.5
    },
    fieldIcon: {
        width: ICON_SLOT,
        flexShrink: 0,
        alignItems: 'center'
    },
    fieldText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.md,
        fontWeight: 700,
        color: theme.colors.text
    },
    // Catches the tap that closes the list, and nothing else. Transparent on
    // purpose — see the note where it is rendered.
    backdrop: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    },
    // Positioned entirely at the call site, from the measured field: only the look
    // lives here.
    list: {
        position: 'absolute',
        backgroundColor: theme.colors.backgroundSecondary,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        // Clips the first and last rows to the rounded corners.
        overflow: 'hidden',
        ...theme.shadows.hardLarge
    },
    listScroll: {
        // Not `flex: 1`, which would stretch a two-row list to the full ceiling.
        flexGrow: 0
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three
    },
    // Only between rows — the list's own border does the work at the two ends.
    rowDivided: {
        borderTopWidth: 2,
        borderTopColor: theme.colors.border
    },
    rowHovered: {
        backgroundColor: theme.colors.backgroundSelected
    },
    rowIcon: {
        width: ICON_SLOT,
        flexShrink: 0,
        alignItems: 'center'
    },
    rowText: {
        flex: 1,
        minWidth: 0
    },
    rowTitle: {
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.2,
        fontWeight: 700,
        color: theme.colors.text
    },
    rowDescription: {
        marginTop: Spacing.half,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.4,
        color: theme.colors.textSecondary
    },
    check: {
        width: CHECK_SIZE,
        height: CHECK_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 999
    },
    checkOn: {
        backgroundColor: theme.colors.primary
    },
    checkOff: {
        backgroundColor: theme.colors.muted
    }
}))
