import AppText from "@/components/text/AppText";
import { fontFamilyForWeight, FontSizes, Radii, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { Platform, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

interface Props {
    value: string,
    onChangeText: (value: string) => void,
    maxLength: number,
    placeholder?: string,
    // Names the field for screen readers, since there is no label above it.
    accessibilityLabel: string,
    disabled?: boolean,
    autoFocus?: boolean,
    onSubmitEditing?: () => void,
    style?: StyleProp<ViewStyle>
}

const MIN_HEIGHT = 120;
// The box around it is the field, so the browser's focus ring inside it would be a second one; RN's types do not list the value react-native-web takes.
const NO_FOCUS_RING = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;
// The counter turns loud this close to the limit.
const NEAR_LIMIT = 10;

// A roomy multi-line box for a sentence, with a count of what is left.
export default function BigTextInput({
    value,
    onChangeText,
    maxLength,
    placeholder,
    accessibilityLabel,
    disabled = false,
    autoFocus = false,
    onSubmitEditing,
    style
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const near = maxLength - value.length <= NEAR_LIMIT;

    return (
        <View style={[styles.box, disabled && styles.disabled, style]}>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                maxLength={maxLength}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted}
                accessibilityLabel={accessibilityLabel}
                editable={!disabled}
                autoFocus={autoFocus}
                multiline
                // Enter sends rather than breaking the line: an answer is one sentence.
                submitBehavior='submit'
                returnKeyType='done'
                onSubmitEditing={onSubmitEditing}
                autoCapitalize='sentences'
                textAlignVertical='top'
                style={[styles.input, NO_FOCUS_RING]}
            />

            <AppText style={[styles.counter, near && styles.counterNear]}>
                {`${value.length}/${maxLength}`}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    box: {
        minHeight: MIN_HEIGHT,
        padding: Spacing.three,
        gap: Spacing.two,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        borderRadius: Radii.xl,
        backgroundColor: theme.colors.backgroundInput,
        ...theme.shadows.hardSmall
    },
    input: {
        flexGrow: 1,
        minHeight: MIN_HEIGHT - Spacing.three * 2 - FontSizes.xs - Spacing.two,
        padding: 0,
        fontSize: FontSizes.xl,
        lineHeight: FontSizes.xl * 1.25,
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(700),
        color: theme.colors.text
    },
    // Tabular, so the count does not jitter as it ticks.
    counter: {
        alignSelf: 'flex-end',
        fontSize: FontSizes.xs,
        fontWeight: 800,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    },
    counterNear: {
        color: theme.colors.destructiveText
    },
    disabled: {
        opacity: 0.5
    }
}))
