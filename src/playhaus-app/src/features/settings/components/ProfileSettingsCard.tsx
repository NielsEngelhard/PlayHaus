import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import Toggle from "@/components/ui/Toggle";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { SETTINGS, type SettingKey } from "@/features/settings/profile";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    values: Record<SettingKey, boolean>,
    onChange: (key: SettingKey, value: boolean) => void,
    /** A save is in the air, so no switch takes a second one until it lands. */
    disabled?: boolean
}

/** The switch list: one row per preference, divided the way the design divides them. */
export default function ProfileSettingsCard({ values, onChange, disabled = false }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <Card>
            <AppText style={styles.label}>{t('profile.settings.title')}</AppText>

            <View style={styles.rows}>
                {SETTINGS.map((setting, index) => (
                    <View
                        key={setting.key}
                        style={[styles.row, index > 0 && styles.rowDivided]}
                    >
                        <View style={styles.info}>
                            <View style={styles.iconTile}>
                                <Feather name={setting.icon} size={16} color={theme.colors.text} />
                            </View>

                            <View style={styles.text}>
                                <AppText style={styles.title}>{t(setting.titleKey)}</AppText>
                                <AppText style={styles.description}>{t(setting.descriptionKey)}</AppText>
                            </View>
                        </View>

                        <Toggle
                            value={values[setting.key]}
                            onValueChange={value => onChange(setting.key, value)}
                            label={t(setting.titleKey)}
                            disabled={disabled}
                        />
                    </View>
                ))}
            </View>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    rows: {
        marginTop: Spacing.three
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        paddingVertical: Spacing.three
    },
    // Only between rows — the card's own padding does the work at the two ends.
    rowDivided: {
        borderTopWidth: 2,
        borderTopColor: theme.colors.border
    },
    info: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.two
    },
    iconTile: {
        width: 32,
        height: 32,
        flexShrink: 0,
        marginTop: Spacing.half,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 10,
        backgroundColor: theme.colors.backgroundInput
    },
    text: {
        flex: 1,
        minWidth: 0
    },
    // Deliberately the same three values `ToggleRow` uses. This card hand-rolls its own
    // version of that row, and the two sit either side of the same stamped switch — if the
    // type scales drift apart the switch looks like two different controls.
    title: {
        fontSize: 15,
        lineHeight: 15 * 1.2,
        fontWeight: 800,
        color: theme.colors.text
    },
    description: {
        marginTop: 3,
        fontSize: 12.5,
        lineHeight: 12.5 * 1.4,
        fontWeight: 500,
        color: theme.colors.textMuted
    }
}))
