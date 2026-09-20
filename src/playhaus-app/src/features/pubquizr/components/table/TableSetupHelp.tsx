import AppText from "@/components/text/AppText";
import { FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const ICON = 16;

interface Props {
    /** The address to read out, and null on a build that does not know one. */
    url: string | null
}

// The four ways a table gets a screen. Two are a browser opening a page; the other two are the phone or laptop mirroring that same page.
export default function TableSetupHelp({ url }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const ways = [
        { icon: 'tv', text: url === null ? t('pubquizr.table.setup.wayBrowserPlain') : t('pubquizr.table.setup.wayBrowser', { url }) },
        { icon: 'monitor', text: t('pubquizr.table.setup.wayHdmi') },
        { icon: 'cast', text: t('pubquizr.table.setup.wayCast') },
        { icon: 'airplay', text: t('pubquizr.table.setup.wayMirror') }
    ] as const;

    return (
        <View style={styles.help}>
            <AppText style={styles.label}>{t('pubquizr.table.setup.title')}</AppText>

            {ways.map(way => (
                <View key={way.icon} style={styles.way}>
                    <Feather name={way.icon} size={ICON} color={theme.colors.textSecondary} />

                    <AppText style={styles.text}>{way.text}</AppText>
                </View>
            ))}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    help: {
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },

    label: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    way: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    text: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        fontWeight: 600,
        color: theme.colors.textSecondary
    }
}))
