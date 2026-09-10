import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

/** Which of the board's two committing fills the button wears. */
type Tone = 'mint' | 'ink';

interface Props {
    text: string,
    onPress: () => void,
    disabled?: boolean,
    tone?: Tone,
    /** Trailing icon. There is none by default. */
    icon?: keyof typeof Feather.glyphMap
}

// The one committing button on a board screen: send this, vote this, read the next round.
export default function PlayButton({ text, onPress, disabled = false, tone = 'mint', icon }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const ink = tone === 'mint' ? Brand.ink : theme.colors.background;

    return (
        <PopPressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityState={{ disabled }}
            style={[styles.button, tone === 'mint' ? styles.mint : styles.ink, disabled && styles.disabled]}
        >
            <View style={styles.body}>
                <AppText style={[styles.label, { color: ink }]}>{text}</AppText>

                {icon !== undefined && <Feather name={icon} size={16} color={ink} />}
            </View>
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        height: 54,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        ...theme.shadows.hard
    },
    body: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9
    },
    // A brand surface rather than a themed one, so its outline is ink in both schemes.
    mint: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },
    // The scheme's own ink, which inverts to paper in the dark.
    ink: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.text
    },
    disabled: {
        opacity: 0.5
    },
    label: {
        fontSize: 15,
        fontWeight: 900,
        textAlign: 'center'
    }
}))
