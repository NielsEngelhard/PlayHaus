import AppText from '@/components/text/AppText';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import PopPressable from '@/components/ui/PopPressable';
import Toggle from '@/components/ui/Toggle';
import { usePressPop } from '@/components/ui/usePressPop';
import { Brand, FontSizes, Radii, Spacing } from '@/constants/theme';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { View } from 'react-native';

// More options than this and the segment drops under its label, across the full width.
const INLINE_MAX_OPTIONS = 3;

// Labels this short are numbers, which the design pads wider so they read as buttons.
const SHORT_LABEL = 2;

// The host's settings for the room, always open, one row per setting.
export default function LobbySettings({ title, children }: { title: string, children: ReactNode }) {
    const styles = useStyles();

    return (
        <View style={styles.card}>
            <AppText style={styles.cardTitle}>{title}</AppText>

            {children}
        </View>
    )
}

interface SegmentProps<T> {
    getAccessibilityLabel?: (option: T) => string,
    getLabel: (option: T) => string,
    hint?: string,
    label: string,
    onChange: (value: T) => void,
    options: readonly T[],
    // Forces the segment under the label, for a label too long to share its line.
    stacked?: boolean,
    value: T,
    // The chosen option spelled out at the end of the label's line, shown only when stacked.
    valueLabel?: string
}

// One setting picked from a handful of options.
export function LobbySettingSegment<T>({
    getAccessibilityLabel,
    getLabel,
    hint,
    label,
    onChange,
    options,
    stacked = options.length > INLINE_MAX_OPTIONS,
    value,
    valueLabel
}: SegmentProps<T>) {
    const styles = useStyles();

    const track = (
        <View style={[styles.track, stacked && styles.trackStacked]} accessibilityRole='radiogroup' accessibilityLabel={label}>
            {options.map((option, index) => (
                <SegmentOption
                    key={index}
                    label={getLabel(option)}
                    accessibilityLabel={getAccessibilityLabel?.(option) ?? getLabel(option)}
                    selected={option === value}
                    stretch={stacked}
                    onPress={() => onChange(option)}
                />
            ))}
        </View>
    );

    return (
        <View style={styles.setting}>
            {stacked ? (
                <>
                    <View style={styles.stackedHeader}>
                        <AppText style={styles.rowLabel}>{label}</AppText>

                        {valueLabel && <AppText style={styles.valueLabel}>{valueLabel}</AppText>}
                    </View>

                    {track}
                </>
            ) : (
                <View style={styles.row}>
                    <AppText style={styles.rowLabel}>{label}</AppText>

                    {track}
                </View>
            )}

            {hint && <AppText style={styles.hint}>{hint}</AppText>}
        </View>
    )
}

interface SegmentOptionProps {
    accessibilityLabel: string,
    label: string,
    onPress: () => void,
    selected: boolean,
    stretch: boolean
}

function SegmentOption({ accessibilityLabel, label, onPress, selected, stretch }: SegmentOptionProps) {
    const styles = useStyles();
    const pop = usePressPop();

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={pop.onPressIn}
            onPressOut={pop.onPressOut}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            accessibilityRole='radio'
            accessibilityLabel={accessibilityLabel}
            aria-checked={selected}
            style={[
                styles.option,
                label.length <= SHORT_LABEL && styles.optionShort,
                stretch && styles.optionStretch,
                selected && styles.optionSelected,
                pop.animatedStyle
            ]}
        >
            <AppText style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</AppText>
        </AnimatedPressable>
    )
}

interface SwitchProps {
    description?: string,
    disabled?: boolean,
    label: string,
    onChange: (value: boolean) => void,
    value: boolean
}

// One setting that is either on or off.
export function LobbySettingSwitch({ description, disabled = false, label, onChange, value }: SwitchProps) {
    const styles = useStyles();

    return (
        <View style={styles.row}>
            <View style={styles.rowText}>
                <AppText style={styles.rowLabel}>{label}</AppText>

                {description && <AppText style={styles.description}>{description}</AppText>}
            </View>

            <Toggle value={value} onValueChange={onChange} label={label} disabled={disabled} />
        </View>
    )
}

interface LinkProps {
    label: string,
    onPress: () => void,
    summary: string
}

// A setting too big for one row, which opens somewhere else.
export function LobbySettingLink({ label, onPress, summary }: LinkProps) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <PopPressable
            style={styles.row}
            onPress={onPress}
            accessibilityRole='button'
            accessibilityLabel={`${label}: ${summary}`}
        >
            <View style={styles.rowText}>
                <AppText style={styles.rowLabel}>{label}</AppText>

                <AppText style={styles.description}>{summary}</AppText>
            </View>

            <Feather name='chevron-right' size={FontSizes.md} color={theme.colors.textSecondary} />
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    cardTitle: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: theme.colors.textSecondary
    },
    setting: {
        gap: Spacing.one
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    stackedHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: Spacing.two,
        marginBottom: Spacing.one
    },
    rowText: {
        flex: 1,
        minWidth: 0
    },
    rowLabel: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.md,
        fontWeight: 700,
        color: theme.colors.text
    },
    valueLabel: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    description: {
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        fontWeight: 500,
        color: theme.colors.textSecondary
    },
    hint: {
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        fontWeight: 500,
        color: theme.colors.textSecondary
    },
    track: {
        flexShrink: 0,
        flexDirection: 'row',
        padding: Spacing.half,
        borderRadius: Radii.md,
        backgroundColor: theme.colors.backgroundInput
    },
    trackStacked: {
        flexShrink: 1
    },
    option: {
        alignItems: 'center',
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.sm
    },
    optionShort: {
        paddingHorizontal: Spacing.three
    },
    optionStretch: {
        flex: 1,
        paddingHorizontal: 0
    },
    optionSelected: {
        backgroundColor: theme.colors.focus
    },
    optionText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },
    // The focus colour is blue in light and lemon in dark, so the ink on it flips too.
    optionTextSelected: {
        color: theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent
    }
}))
