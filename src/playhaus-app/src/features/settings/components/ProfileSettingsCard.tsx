import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import Toggle from "@/components/ui/Toggle";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { SETTINGS, type SettingKey } from "@/features/settings/profile";
import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, View } from "react-native";

interface Props {
    values: Record<SettingKey, boolean>,
    onChange: (key: SettingKey, value: boolean) => void
}

/** The switch list: one row per preference, divided the way the design divides them. */
export default function ProfileSettingsCard({ values, onChange }: Props) {
    return (
        <Card>
            <AppText style={styles.label}>Instellingen</AppText>

            <View style={styles.rows}>
                {SETTINGS.map((setting, index) => (
                    <View
                        key={setting.key}
                        style={[styles.row, index > 0 && styles.rowDivided]}
                    >
                        <View style={styles.info}>
                            <View style={styles.iconTile}>
                                <Feather name={setting.icon} size={16} color={Colors.light.text} />
                            </View>

                            <View style={styles.text}>
                                <AppText style={styles.title}>{setting.title}</AppText>
                                <AppText style={styles.description}>{setting.description}</AppText>
                            </View>
                        </View>

                        <Toggle
                            value={values[setting.key]}
                            onValueChange={value => onChange(setting.key, value)}
                            label={setting.title}
                        />
                    </View>
                ))}
            </View>
        </Card>
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
    rows: {
        marginTop: Spacing.three
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingVertical: Spacing.three
    },
    // Only between rows — the card's own padding does the work at the two ends.
    rowDivided: {
        borderTopWidth: 2,
        borderTopColor: Colors.light.border
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
        borderColor: Colors.light.border,
        borderRadius: 10,
        backgroundColor: Colors.light.backgroundInput
    },
    text: {
        flex: 1,
        minWidth: 0
    },
    title: {
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.2,
        fontWeight: 700,
        color: Colors.light.text
    },
    description: {
        marginTop: Spacing.half,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.4,
        color: Colors.light.textSecondary
    }
})
