import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Spacing, fontFamilyForWeight } from "@/constants/theme";
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

interface Props {
    /** Uppercase micro-label above the field. Also names the field for screen readers. */
    label: string
    value: string
    onChangeText: (value: string) => void
    placeholder?: string
    secureTextEntry?: boolean
    keyboardType?: TextInputProps['keyboardType']
    autoCapitalize?: TextInputProps['autoCapitalize']
    /** Lets the OS and browsers offer saved credentials. Worth setting on every auth field. */
    autoComplete?: TextInputProps['autoComplete']
    textContentType?: TextInputProps['textContentType']
    returnKeyType?: TextInputProps['returnKeyType']
    onSubmitEditing?: () => void
    autoFocus?: boolean
    editable?: boolean
    /** For layout only — how the field sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * A labelled single-line input in the app's chrome: hard border, sunken fill.
 *
 * The look is the one `ProfileNameCard` established; it lives here so the auth
 * forms don't grow a second, slightly different copy of it.
 */
export default function TextField({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType,
    autoCapitalize = 'none',
    autoComplete,
    textContentType,
    returnKeyType,
    onSubmitEditing,
    autoFocus = false,
    editable = true,
    style
}: Props) {
    return (
        <View style={style}>
            <AppText style={styles.label}>{label}</AppText>

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.light.textSecondary}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                autoComplete={autoComplete}
                textContentType={textContentType}
                autoCorrect={false}
                returnKeyType={returnKeyType}
                onSubmitEditing={onSubmitEditing}
                autoFocus={autoFocus}
                editable={editable}
                accessibilityLabel={label}
                style={[styles.input, !editable && styles.disabled]}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    },
    input: {
        marginTop: Spacing.two,
        height: 46,
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        backgroundColor: Colors.light.backgroundInput,
        paddingHorizontal: Spacing.three,
        fontSize: FontSizes.lg,
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(700),
        color: Colors.light.text
    },
    disabled: {
        opacity: 0.5
    }
})
