import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
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
import Label from "../text/Label";

export interface SelectOption<T extends string> {
    value: T,
    label: string,
    /** Optional second line. Shown in the open list only — the field stays one line. */
    description?: string,
    // Drawn to the left of the label, in the field and in every row.
    icon?: ReactNode
}

interface Props<T extends string> {
    label: string,
    value: T,
    options: readonly SelectOption<T>[],
    onChange: (value: T) => void,
    /** Greyed out and unopenable — for a field whose save is still in the air. */
    disabled?: boolean,
    // `card` (the default) is the standing shape: a `Card` of its own, its label above the field.
    variant?: 'card' | 'inline' | 'row'
}

/** Where the field is on screen, so the list can be put under it. */
interface Anchor {
    x: number,
    y: number,
    width: number,
    height: number
}

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
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

// Pick one of a list, the way a browser's `select` does it.
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
    const t = useT();

    const field = useRef<View>(null);
    const [anchor, setAnchor] = useState<Anchor | null>(null);
    const [open, setOpen] = useState(false);
    const { height: windowHeight } = useWindowDimensions();

    // The modal has to outlive `open`, or closing would tear the list off screen with the animation meant to see it out still to play.
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

    // Any option having an icon reserves the slot for all of them.
    const withIcons = options.some(option => option.icon !== undefined);

    function show() {
        if (disabled) return;

        // Measured rather than remembered: the field moves with the page, and the last place it was is not where it is now.
        field.current?.measureInWindow((x, y, width, height) => {
            setAnchor({ x, y, width, height });
            setOpen(true);
        });
    }

    function choose(option: SelectOption<T>) {
        onChange(option.value);
        setOpen(false);
    }

    // Below the field when there is room for a usable list, above it when there is not.
    const below = anchor === null ? 0 : windowHeight - (anchor.y + anchor.height) - GAP - SCREEN_MARGIN;
    const above = anchor === null ? 0 : anchor.y - GAP - SCREEN_MARGIN;
    const dropUp = below < MIN_ROOM && above > below;

    const row = variant === 'row';

    const body = (
        <View>
            {/* The row carries its own label, inside the line rather than above it. */}
            {label && !row && (
                <Label label={label} />
            )}

            <Pressable
                ref={field}
                onPress={show}
                disabled={disabled}
                accessibilityRole='button'
                accessibilityLabel={t('common.selectValue', { label, value: selected?.label ?? t('common.nothingSelected') })}
                // `aria-expanded` rather than `accessibilityState={{ expanded }}`.
                aria-expanded={open}
                style={[
                    row ? styles.fieldRow : styles.field,
                    disabled && !row && styles.fieldDisabled,
                    disabled && row && styles.dimmed
                ]}
            >
                {withIcons && (
                    <View style={styles.fieldIcon}>{selected?.icon}</View>
                )}

                {/* A value with no matching option means the caller and the list are out of step. */}
                {row ? (
                    <>
                        <AppText style={styles.fieldRowLabel} numberOfLines={1}>{label}</AppText>

                        <AppText style={styles.fieldRowValue} numberOfLines={1}>
                            {selected?.label ?? '—'}
                        </AppText>
                    </>
                ) : (
                    <AppText style={[styles.fieldText, disabled && styles.dimmed]} numberOfLines={1}>
                        {selected?.label ?? '—'}
                    </AppText>
                )}

                {/* The row's chevron points into the list it opens rather than tracking open/closed. */}
                <Feather
                    name={row ? 'chevron-right' : open ? 'chevron-up' : 'chevron-down'}
                    size={row ? 17 : 20}
                    color={
                        disabled ? theme.colors.textSecondary
                            : row ? theme.colors.textMuted
                                : theme.colors.text
                    }
                />
            </Pressable>

            {present && anchor !== null && (
                <Modal
                    visible
                    transparent
                    // Animated here, in one place, rather than half here and half in whatever each platform's own transition happens to be.
                    animationType='none'
                    statusBarTranslucent
                    // Android's back button and the web's Escape.
                    onRequestClose={() => setOpen(false)}
                >
                    {/* No dim behind it. */}
                    <Pressable
                        style={styles.backdrop}
                        onPress={() => setOpen(false)}
                        accessibilityRole='button'
                        accessibilityLabel={t('common.close')}
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
                            // The list is usually shorter than its ceiling; this keeps it that height rather than stretching it to fill.
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
        </View>
    );

    return variant === 'card' ? <Card>{body}</Card> : <View>{body}</View>;
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
            aria-checked={selected}
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
    // Sunken, the way a text input reads — this is somewhere you put a value, not a button that does something.
    field: {
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
    fieldDisabled: {
        backgroundColor: theme.colors.muted
    },
    // The same control with none of the chrome: no fill, no outline, no shadow.
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    // The line reads like a sentence: what this row is in the row's own voice, the current answer quieter at the far end, the chevron saying there are others.
    fieldRowLabel: {
        flex: 1,
        minWidth: 0,
        fontSize: 15,
        fontWeight: 700,
        color: theme.colors.text
    },
    fieldRowValue: {
        flexShrink: 1,
        fontSize: 15,
        fontWeight: 700,
        color: theme.colors.textSecondary
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
    // Catches the tap that closes the list, and nothing else.
    backdrop: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    },
    // Positioned entirely at the call site, from the measured field: only the look lives here.
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
        paddingVertical: Spacing.three,
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
