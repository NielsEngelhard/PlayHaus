import PopPressable from "@/components/ui/PopPressable";
import { Radii } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useFullscreen } from "@/features/screen/use-fullscreen";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const BUTTON = 40;

interface Props {
    /** Dimmed while the table is playing, so the one tappable thing on the screen is not part of the game. */
    idle: boolean
    scale: number
}

// The only control on a screen that is otherwise just something to read, kept in the rules bar and out of the stage.
export default function TableChrome({ idle, scale }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { active, supported, toggle } = useFullscreen();
    if (!supported) return null;

    const size = Math.round(BUTTON * scale);

    return (
        <View style={!idle && styles.faded}>
            <PopPressable
                onPress={toggle}
                accessibilityRole="button"
                accessibilityLabel={active
                    ? t('pubquizr.table.setup.exitFullScreen')
                    : t('pubquizr.table.setup.fullScreen')}
                style={[styles.button, { width: size, height: size }]}
            >
                <Feather
                    name={active ? 'minimize' : 'maximize'}
                    size={Math.round(18 * scale)}
                    color={theme.colors.textSecondary}
                />
            </PopPressable>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    faded: {
        opacity: 0.25
    },

    button: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    }
}))
